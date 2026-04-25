#!/usr/bin/env node

import * as readline from 'node:readline';
import { SteamClient } from './steam/client.js';
import {
  loginWithQR,
  loginWithCredentials,
  loginWithStoredCredentials,
  hasStoredLogin,
} from './steam/auth.js';
import { promptAuthMethod } from './ui/prompts.js';
import { selectGames } from './ui/gameSelector.js';
import {
  showWelcome,
  showIdlingStatus,
  showLoginSuccess,
  showLoginError,
  showGoodbye,
  showError,
} from './ui/display.js';
import { loadFavorites, loadExempt } from './storage/favorites.js';
import ora from 'ora';
import type { SteamGame, GameSelection, IdlingGame, LoginResult } from './types/index.js';

const args = process.argv.slice(2);
const isHeadless = args.includes('--headless');

const HOURS_MS = 60 * 60 * 1000;
const client = new SteamClient();
let isIdling = false;
let idlingGames: IdlingGame[] = [];
let pausedGames: IdlingGame[] = [];
let pausingGames: IdlingGame[] = [];
let allGames: SteamGame[] = [];
let startTime: Date | null = null;
let updateInterval: NodeJS.Timeout | null = null;
let isInEditMode = false;
let accountName: string = '';
let exemptAppId: number | null = null;

// 7-30 days, the active idle phase length before a game enters cooldown
function randomIdlePhaseMs(): number {
  return Math.floor((168 + Math.random() * 552) * HOURS_MS);
}

// 100-200 hours, the cooldown length before a game rejoins the idle pool
function randomCooldownMs(): number {
  return Math.floor((100 + Math.random() * 100) * HOURS_MS);
}

// Moves games between idling/pausing arrays based on per-game random schedules
function tickRandomizer(): void {
  const now = new Date();
  let mutated = false;

  const stillIdling: IdlingGame[] = [];
  for (const game of idlingGames) {
    if (game.nextPauseAtMs === null) {
      stillIdling.push(game);
      continue;
    }
    const elapsedMs = game.accumulatedMs + (now.getTime() - game.startTime.getTime());
    if (elapsedMs >= game.nextPauseAtMs) {
      game.accumulatedMs = elapsedMs;
      game.pauseUntil = new Date(now.getTime() + randomCooldownMs());
      pausingGames.push(game);
      mutated = true;
    } else {
      stillIdling.push(game);
    }
  }
  if (mutated) idlingGames = stillIdling;

  const stillCooling: IdlingGame[] = [];
  for (const game of pausingGames) {
    if (game.pauseUntil && now >= game.pauseUntil) {
      game.pauseUntil = null;
      game.startTime = now;
      game.nextPauseAtMs = game.accumulatedMs + randomIdlePhaseMs();
      idlingGames.push(game);
      mutated = true;
    } else {
      stillCooling.push(game);
    }
  }
  if (mutated) {
    pausingGames = stillCooling;
    client.setGamesPlaying(idlingGames.map((g) => g.appid));
  }
}

// Main entry point that orchestrates the application flow
async function main(): Promise<void> {
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  if (isHeadless) {
    await runHeadless();
  } else {
    await runInteractive();
  }

  await new Promise<void>(() => {});
}

// Headless mode: auto-login and start idling favorites
async function runHeadless(): Promise<void> {
  if (!hasStoredLogin()) {
    showError('No stored login found. Run interactively first to log in.');
    process.exit(1);
  }

  const spinner = ora('Logging in...').start();
  const loginResult = await loginWithStoredCredentials(client);
  if (!loginResult.success) {
    spinner.fail('Login failed');
    showError(loginResult.error || 'Unknown error');
    process.exit(1);
  }
  accountName = loginResult.accountName!;
  spinner.succeed(`Logged in as ${accountName}`);

  const gamesSpinner = ora('Fetching your game library...').start();
  try {
    allGames = await client.getOwnedGames();
    gamesSpinner.succeed(`Found ${allGames.length} games`);
  } catch (err) {
    gamesSpinner.fail('Failed to fetch games');
    showError((err as Error).message);
    process.exit(1);
  }

  const favoriteIds = loadFavorites(accountName);
  if (favoriteIds.length === 0) {
    showError('No favorites configured. Run interactively first to set favorites.');
    process.exit(1);
  }

  exemptAppId = loadExempt(accountName);

  const selectedGames: GameSelection[] = allGames
    .filter((g) => favoriteIds.includes(g.appid))
    .map((g) => ({ appid: g.appid, name: g.name }));

  if (selectedGames.length === 0) {
    showError('No matching games found for your favorites.');
    process.exit(1);
  }

  const exemptName = exemptAppId
    ? allGames.find((g) => g.appid === exemptAppId)?.name ?? null
    : null;
  console.log(`Starting ${selectedGames.length} favorite game(s)...`);
  if (exemptName) console.log(`Exempt from randomizer: ${exemptName}`);
  startIdling(selectedGames);
}

// Interactive mode: full UI with prompts and game selector
async function runInteractive(): Promise<void> {
  showWelcome();

  const loginResult = await handleLogin();
  if (!loginResult.success) {
    showLoginError(loginResult.error || 'Unknown error');
    process.exit(1);
  }

  accountName = loginResult.accountName!;
  showLoginSuccess(accountName);

  const spinner = ora('Fetching your game library...').start();
  try {
    allGames = await client.getOwnedGames();
    spinner.succeed(`Found ${allGames.length} games in your library`);
  } catch (err) {
    spinner.fail('Failed to fetch games');
    showError((err as Error).message);
    process.exit(1);
  }

  if (allGames.length === 0) {
    showError('No games found in your library');
    process.exit(1);
  }

  const { selectedGames, exemptAppId: selectedExempt } = await selectGames(allGames, accountName);

  if (selectedGames.length === 0) {
    showError('No games selected');
    process.exit(1);
  }

  exemptAppId = selectedExempt;
  startIdling(selectedGames);
}

// Handles authentication method selection and login
async function handleLogin(): Promise<LoginResult> {
  const hasStored = hasStoredLogin();
  const method = await promptAuthMethod(hasStored);

  switch (method) {
    case 'stored':
      return loginWithStoredCredentials(client);
    case 'qr':
      return loginWithQR(client);
    case 'credentials':
      return loginWithCredentials(client);
    default:
      return { success: false, error: 'Invalid login method' };
  }
}

// Sets up raw mode keyboard input handling for edit and quit commands
function setupKeyboardInput(): void {
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on('keypress', async (str, key) => {
      if (key && key.ctrl && key.name === 'c') {
        handleShutdown();
        return;
      }

      if (isInEditMode) {
        return;
      }

      if (str === 'e' || str === 'E') {
        await enterEditMode();
        return;
      }

      if (str === 'q' || str === 'Q') {
        handleShutdown();
        return;
      }
    });
  }
}

// Creates an IdlingGame object from a GameSelection
function createIdlingGame(
  game: GameSelection,
  steamGame?: SteamGame,
  isExempt = false
): IdlingGame {
  const initialPlaytime = steamGame?.playtime_forever ?? 0;
  return {
    appid: game.appid,
    name: game.name,
    initialPlaytime,
    startTime: new Date(),
    accumulatedMs: 0,
    nextPauseAtMs: isExempt ? null : randomIdlePhaseMs(),
    pauseUntil: null,
  };
}

// Converts IdlingGame array back to GameSelection array for the selector
function getGameCurrentSelection(): GameSelection[] {
  return [...idlingGames, ...pausedGames, ...pausingGames].map((g) => ({
    appid: g.appid,
    name: g.name,
  }));
}

// Handles edit mode for changing game selection while idling
async function enterEditMode(): Promise<void> {
  isInEditMode = true;

  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  const now = new Date();
  for (const game of idlingGames) {
    game.accumulatedMs += now.getTime() - game.startTime.getTime();
  }

  console.clear();

  const currentSelection = getGameCurrentSelection();
  const { selectedGames: newSelection, exemptAppId: newExemptAppId } = await selectGames(
    allGames,
    accountName,
    currentSelection
  );

  if (newSelection.length === 0) {
    showError('No games selected - keeping current selection');
    for (const game of idlingGames) {
      game.startTime = new Date();
    }
  } else {
    const oldAppIds = new Set(
      [...idlingGames, ...pausedGames, ...pausingGames].map((g) => g.appid)
    );
    const newAppIds = new Set(newSelection.map((g) => g.appid));

    const applyExemptChange = (game: IdlingGame): void => {
      const shouldBeExempt = game.appid === newExemptAppId;
      const wasExempt = game.nextPauseAtMs === null;
      if (shouldBeExempt && !wasExempt) {
        game.nextPauseAtMs = null;
        game.pauseUntil = null;
      } else if (!shouldBeExempt && wasExempt) {
        game.nextPauseAtMs = game.accumulatedMs + randomIdlePhaseMs();
      }
    };

    const keptIdlingGames: IdlingGame[] = [];
    const keptPausedGames: IdlingGame[] = [];
    const keptPausingGames: IdlingGame[] = [];

    for (const game of idlingGames) {
      if (newAppIds.has(game.appid)) {
        applyExemptChange(game);
        game.startTime = new Date();
        keptIdlingGames.push(game);
      }
    }

    for (const game of pausedGames) {
      if (newAppIds.has(game.appid)) {
        applyExemptChange(game);
        keptPausedGames.push(game);
      }
    }

    for (const game of pausingGames) {
      if (newAppIds.has(game.appid)) {
        applyExemptChange(game);
        // Becoming exempt clears pauseUntil — game rejoins idling immediately
        if (game.nextPauseAtMs === null) {
          game.startTime = new Date();
          keptIdlingGames.push(game);
        } else {
          keptPausingGames.push(game);
        }
      }
    }

    for (const selection of newSelection) {
      if (!oldAppIds.has(selection.appid)) {
        const steamGame = allGames.find((g) => g.appid === selection.appid);
        const isExempt = selection.appid === newExemptAppId;
        keptIdlingGames.push(createIdlingGame(selection, steamGame, isExempt));
      }
    }

    idlingGames = keptIdlingGames;
    pausedGames = keptPausedGames;
    pausingGames = keptPausingGames;
    exemptAppId = newExemptAppId;

    client.setGamesPlaying(idlingGames.map((g) => g.appid));
  }

  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  isInEditMode = false;

  if (startTime) {
    showIdlingStatus(idlingGames, pausedGames, pausingGames);
    updateInterval = setInterval(() => {
      if (startTime && !isInEditMode) {
        tickRandomizer();
        showIdlingStatus(idlingGames, pausedGames, pausingGames);
      }
    }, 60000);
  }
}

// Handles state changes when user plays or stops playing a game on Steam
function handlePlayingState(blocked: boolean, playingApp: number): void {
  if (isInEditMode) return;

  if (blocked) {
    const idleIndex = idlingGames.findIndex((g) => g.appid === playingApp);
    if (idleIndex !== -1) {
      const game = idlingGames[idleIndex];
      const now = new Date();
      game.accumulatedMs += now.getTime() - game.startTime.getTime();

      const [pausedGame] = idlingGames.splice(idleIndex, 1);
      pausedGames.push(pausedGame);

      client.setGamesPlaying(idlingGames.map((g) => g.appid));
      showIdlingStatus(idlingGames, pausedGames, pausingGames);
      return;
    }

    const coolingIndex = pausingGames.findIndex((g) => g.appid === playingApp);
    if (coolingIndex !== -1) {
      const [pausedGame] = pausingGames.splice(coolingIndex, 1);
      pausedGames.push(pausedGame);
      showIdlingStatus(idlingGames, pausedGames, pausingGames);
    }
  } else {
    if (pausedGames.length > 0) {
      const now = new Date();
      const restoredIdling: IdlingGame[] = [];
      const restoredCooling: IdlingGame[] = [];

      for (const game of pausedGames) {
        if (game.pauseUntil && now < game.pauseUntil) {
          restoredCooling.push(game);
        } else {
          game.pauseUntil = null;
          game.startTime = now;
          if (game.nextPauseAtMs !== null) {
            game.nextPauseAtMs = game.accumulatedMs + randomIdlePhaseMs();
          }
          restoredIdling.push(game);
        }
      }

      idlingGames.push(...restoredIdling);
      pausingGames.push(...restoredCooling);
      pausedGames = [];

      client.setGamesPlaying(idlingGames.map((g) => g.appid));
      showIdlingStatus(idlingGames, pausedGames, pausingGames);
    }
  }
}

// Initializes the idling session and starts the display loop
function startIdling(games: GameSelection[]): void {
  isIdling = true;
  startTime = new Date();

  idlingGames = games.map((game) => {
    const steamGame = allGames.find((g) => g.appid === game.appid);
    return createIdlingGame(game, steamGame, game.appid === exemptAppId);
  });
  pausedGames = [];
  pausingGames = [];

  const appIds = games.map((g) => g.appid);
  client.setGamesPlaying(appIds);

  setupKeyboardInput();

  showIdlingStatus(idlingGames, pausedGames, pausingGames);

  updateInterval = setInterval(() => {
    if (startTime && !isInEditMode) {
      tickRandomizer();
      showIdlingStatus(idlingGames, pausedGames, pausingGames);
    }
  }, 60000);

  client.onPlayingState(handlePlayingState);

  client.onDisconnected((eresult, msg) => {
    console.log(`\nDisconnected from Steam: ${msg} (${eresult})`);
    handleShutdown();
  });

  client.onError((err) => {
    console.log(`\nSteam error: ${err.message}`);
    handleShutdown();
  });
}

// Graceful shutdown handler that saves state and logs out
function handleShutdown(): void {
  console.log('\n');

  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  if (isIdling) {
    client.stopPlaying();
    isIdling = false;
  }

  if (client.isLoggedIn) {
    client.logout();
  }

  showGoodbye();
  process.exit(0);
}

main().catch((err) => {
  showError(err.message);
  process.exit(1);
});
