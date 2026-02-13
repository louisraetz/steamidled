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
import { loadFavorites } from './storage/favorites.js';
import ora from 'ora';
import type { SteamGame, GameSelection, IdlingGame, LoginResult } from './types/index.js';

const args = process.argv.slice(2);
const isHeadless = args.includes('--headless');

const client = new SteamClient();
let isIdling = false;
let idlingGames: IdlingGame[] = [];
let pausedGames: IdlingGame[] = [];
let allGames: SteamGame[] = [];
let startTime: Date | null = null;
let updateInterval: NodeJS.Timeout | null = null;
let isInEditMode = false;
let accountName: string = '';

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

  const selectedGames: GameSelection[] = allGames
    .filter((g) => favoriteIds.includes(g.appid))
    .map((g) => ({ appid: g.appid, name: g.name }));

  if (selectedGames.length === 0) {
    showError('No matching games found for your favorites.');
    process.exit(1);
  }

  console.log(`Starting ${selectedGames.length} favorite game(s)...`);
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

  const { selectedGames } = await selectGames(allGames, accountName);

  if (selectedGames.length === 0) {
    showError('No games selected');
    process.exit(1);
  }

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
function createIdlingGame(game: GameSelection, steamGame?: SteamGame): IdlingGame {
  const initialPlaytime = steamGame?.playtime_forever ?? 0;
  return {
    appid: game.appid,
    name: game.name,
    initialPlaytime,
    startTime: new Date(),
    accumulatedMs: 0,
  };
}

// Converts IdlingGame array back to GameSelection array for the selector
function getGameCurrentSelection(): GameSelection[] {
  return [...idlingGames, ...pausedGames].map((g) => ({
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
  const { selectedGames: newSelection } = await selectGames(allGames, accountName, currentSelection);

  if (newSelection.length === 0) {
    showError('No games selected - keeping current selection');
    for (const game of idlingGames) {
      game.startTime = new Date();
    }
  } else {
    const oldAppIds = new Set([...idlingGames, ...pausedGames].map((g) => g.appid));
    const newAppIds = new Set(newSelection.map((g) => g.appid));

    const keptIdlingGames: IdlingGame[] = [];
    const keptPausedGames: IdlingGame[] = [];

    for (const game of idlingGames) {
      if (newAppIds.has(game.appid)) {
        game.startTime = new Date();
        keptIdlingGames.push(game);
      }
    }

    for (const game of pausedGames) {
      if (newAppIds.has(game.appid)) {
        keptPausedGames.push(game);
      }
    }

    for (const selection of newSelection) {
      if (!oldAppIds.has(selection.appid)) {
        const steamGame = allGames.find((g) => g.appid === selection.appid);
        keptIdlingGames.push(createIdlingGame(selection, steamGame));
      }
    }

    idlingGames = keptIdlingGames;
    pausedGames = keptPausedGames;

    const appIds = idlingGames.map((g) => g.appid);
    client.setGamesPlaying(appIds);
  }

  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  isInEditMode = false;

  if (startTime) {
    showIdlingStatus(idlingGames, pausedGames);
    updateInterval = setInterval(() => {
      if (startTime && !isInEditMode) {
        showIdlingStatus(idlingGames, pausedGames);
      }
    }, 60000);
  }
}

// Handles state changes when user plays or stops playing a game on Steam
function handlePlayingState(blocked: boolean, playingApp: number): void {
  if (isInEditMode) return;

  if (blocked) {
    const gameIndex = idlingGames.findIndex((g) => g.appid === playingApp);
    if (gameIndex !== -1) {
      const game = idlingGames[gameIndex];
      const now = new Date();
      game.accumulatedMs += now.getTime() - game.startTime.getTime();

      const [pausedGame] = idlingGames.splice(gameIndex, 1);
      pausedGames.push(pausedGame);

      const appIds = idlingGames.map((g) => g.appid);
      client.setGamesPlaying(appIds);

      showIdlingStatus(idlingGames, pausedGames);
    }
  } else {
    if (pausedGames.length > 0) {
      const now = new Date();
      for (const game of pausedGames) {
        game.startTime = now;
      }

      idlingGames.push(...pausedGames);
      pausedGames = [];

      const appIds = idlingGames.map((g) => g.appid);
      client.setGamesPlaying(appIds);

      showIdlingStatus(idlingGames, pausedGames);
    }
  }
}

// Initializes the idling session and starts the display loop
function startIdling(games: GameSelection[]): void {
  isIdling = true;
  startTime = new Date();

  idlingGames = games.map((game) => {
    const steamGame = allGames.find((g) => g.appid === game.appid);
    return createIdlingGame(game, steamGame);
  });
  pausedGames = [];

  const appIds = games.map((g) => g.appid);
  client.setGamesPlaying(appIds);

  setupKeyboardInput();

  showIdlingStatus(idlingGames, pausedGames);

  updateInterval = setInterval(() => {
    if (startTime && !isInEditMode) {
      showIdlingStatus(idlingGames, pausedGames);
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
