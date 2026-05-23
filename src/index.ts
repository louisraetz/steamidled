#!/usr/bin/env node

import * as readline from 'node:readline';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import SteamUser from 'steam-user';
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
import { loadCredentials } from './storage/credentials.js';
import { TelegramNotifier, runTelegramSetup, saveTelegramDisabled } from './notifications/telegram.js';
import { formatDailyReport } from './notifications/dailyReport.js';
import ora from 'ora';
import type { SteamGame, GameSelection, IdlingGame, LoginResult } from './types/index.js';

const args = process.argv.slice(2);
const isHeadless = args.includes('--headless');
const isSetupTelegram = args.includes('--setup-telegram');

const HOURS_MS = 60 * 60 * 1000;
const TAKEOVER_ERESULTS = new Set<number>([6, 34]); // LoggedInElsewhere, LogonSessionReplaced
const RESUME_RETRY_MS = 60_000;
// A reconnect must hold for this long before we announce "▶️ resumed". While the
// player is active on the account, every reconnect is kicked again within
// seconds, so debouncing the notification collapses that flap into a single
// paused/resumed pair instead of one per 60s retry.
const RESUME_NOTIFY_GRACE_MS = 90_000;
const GENERAL_FAILURE_RETRY_LIMIT = 30;
const RATE_LIMIT_RETRY_LIMIT = 10;
// EResults that auto-resume can never fix — credential-bad, account-level, or
// protocol mismatch. Stop fast and require manual action instead of retrying.
const TERMINAL_ERESULTS = new Set<number>([
  5, 15, 26, 27, 126, // InvalidPassword, AccessDenied, Revoked, Expired, CachedCredentialInvalid
  17, 43, 51, 69, 73, 95, 114, // Banned, AccountDisabled, Suspended, ParentalControlRestricted, AccountLockedDown, AccountLimitExceeded, AccountDeleted
  7, 119, 120, // InvalidProtocolVer, LauncherMigrated, SteamRealmMismatch
]);
// EResults from logging in too often — back off hard, never hammer (a fast retry
// escalates the Steam lockout from 30min to hours to 24h).
const RATE_LIMIT_ERESULTS = new Set<number>([84, 87]); // RateLimitExceeded, AccountLoginDeniedThrottle
const BACKOFF_BASE_MS = 60_000;
const BACKOFF_CAP_MS = 15 * 60 * 1000;
const RATE_LIMIT_BACKOFF_CAP_MS = 30 * 60 * 1000;
// Periodic relog to force a playtime commit (clean logOff). Caps worst-case loss
// at this interval instead of the whole session.
const FLUSH_INTERVAL_MS = 4 * HOURS_MS;
// Watchdog that checks server playtime is actually climbing. Must exceed the
// ~30min commit lore to avoid false positives.
const ZOMBIE_CHECK_INTERVAL_MS = 90 * 60 * 1000;
// Grace before exit so a clean logOff socket write (and Telegram fetch) can land.
const CRASH_FLUSH_GRACE_MS = 2000;
const SHUTDOWN_FLUSH_GRACE_MS = 1500;
const TAKEOVER_DRIFT_DELAY_MS = 120_000;

const client = new SteamClient();
const telegram = new TelegramNotifier();
let isIdling = false;
let idlingGames: IdlingGame[] = [];
let pausedGames: IdlingGame[] = [];
let pausingGames: IdlingGame[] = [];
let allGames: SteamGame[] = [];
let gamesById = new Map<number, SteamGame>();
let startTime: Date | null = null;
let updateInterval: NodeJS.Timeout | null = null;
let resumeTimer: NodeJS.Timeout | null = null;
// Pending debounced "▶️ resumed" notification (see RESUME_NOTIFY_GRACE_MS).
let resumeNotifyTimer: NodeJS.Timeout | null = null;
let midnightTimer: NodeJS.Timeout | null = null;
let flushTimer: NodeJS.Timeout | null = null;
let zombieTimer: NodeJS.Timeout | null = null;
let isInEditMode = false;
let isWaitingForResume = false;
let isShuttingDown = false;
let stopNotified = false; // true once a 🛑 stop message has been sent for the current run
let accountName: string = '';
let exemptAppId: number | null = null;
let dayStartAccumulatedMs = new Map<number, number>();
let transientFailureCount = 0;
let rateLimitCount = 0;
// Set immediately before a self-initiated relog (periodic flush or zombie
// recovery). Suppresses the 🛑/▶️ Telegram pair for the relog cycle; cleared in
// restoreIdling once the session is back.
let selfInitiatedRelog = false;
// Last successful single-app playtime probe (zombie watchdog). Doubles as the
// "last known good" baseline for post-takeover drift reporting.
let zombieBaseline: { appid: number; playtime: number; at: number } | null = null;
let lastGoodPlaytime: { appid: number; playtime: number } | null = null;
let takeoverDriftPending = false;
// Consecutive zombie checks with flat server playtime (two-strike: the first
// flat reading triggers a flush relog, only a second confirms a real zombie).
let zombieStrike = 0;

// 7-30 days, the active idle phase length before a game enters cooldown
function randomIdlePhaseMs(): number {
  return Math.floor((168 + Math.random() * 552) * HOURS_MS);
}

// 100-200 hours, the cooldown length before a game rejoins the idle pool
function randomCooldownMs(): number {
  return Math.floor((100 + Math.random() * 100) * HOURS_MS);
}

// Exponential backoff with full jitter; attempt is 1-based.
function backoffMs(attempt: number, capMs: number): number {
  const exp = Math.min(capMs, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
  return Math.floor(exp / 2 + Math.random() * (exp / 2));
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
    if (!isWaitingForResume) {
      client.setGamesPlaying(idlingGames.map((g) => g.appid));
    }
  }
}

// Recognises both shapes steam-user may surface a session-takeover as: a numeric
// eresult attached to the error, or the message string itself.
function isTakeoverError(err: Error & { eresult?: number }): boolean {
  if (err.eresult !== undefined && TAKEOVER_ERESULTS.has(err.eresult)) return true;
  return /loggedinelsewhere|logonsessionreplaced/i.test(err.message ?? '');
}

// Freezes elapsed time and arms the resume poller after any disconnect or Steam error
function enterWaitingState(reason: string): void {
  if (isWaitingForResume) return;
  isWaitingForResume = true;
  // If a resume notification is still inside its grace window, the session is
  // flapping: we reconnected and Steam kicked us again because the player is
  // still active. This pause episode was already announced, so cancel the
  // pending resume and stay silent instead of emitting another paused/resumed
  // pair on every 60s retry.
  const flapping = resumeNotifyTimer !== null;
  if (resumeNotifyTimer) {
    clearTimeout(resumeNotifyTimer);
    resumeNotifyTimer = null;
  }
  const now = new Date();
  for (const game of idlingGames) {
    game.accumulatedMs += now.getTime() - game.startTime.getTime();
  }
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  showIdlingStatus(idlingGames, pausedGames, pausingGames, true);
  // A self-initiated relog (flush/zombie recovery) suppresses the pause message;
  // restoreIdling emits a single quiet "🔄 flush" line instead.
  if (!selfInitiatedRelog && !flapping) {
    telegram.send(`🛑 Idling paused — ${reason}. Auto-retrying every 60s.`);
    stopNotified = true;
  }
  resumeTimer = setTimeout(attemptResume, RESUME_RETRY_MS);
}

// Tries to log back in with the saved refresh token; bounded retries for both auth and generic errors
async function attemptResume(): Promise<void> {
  resumeTimer = null;

  // steam-user has autoRelogin: true and may have silently reconnected on its
  // own between the disconnect event and this timer firing. Calling logOn
  // again in that state throws "Already logged on" from inside a nextTick
  // async function — an unhandled rejection that crashes the process. Detect
  // it here and just restore.
  if (client.isConnected) {
    transientFailureCount = 0;
    rateLimitCount = 0;
    restoreIdling();
    return;
  }

  const credentials = loadCredentials();
  if (!credentials) {
    showError('No stored credentials — cannot auto-resume');
    telegram.send('🛑 Idling stopped — no stored credentials, cannot auto-resume.');
    stopNotified = true;
    handleShutdown(0);
    return;
  }
  try {
    await client.loginWithRefreshToken(credentials.refreshToken, credentials.accountName);
    transientFailureCount = 0;
    rateLimitCount = 0;
    restoreIdling();
  } catch (err) {
    const e = err as Error & { eresult?: number };
    const code = e.eresult;
    const label =
      code !== undefined ? SteamUser.EResult[code] ?? `eresult ${code}` : e.message || 'unknown';

    // Terminal: auto-resume can never fix it (bad credentials, account-level
    // block, or protocol mismatch). Stop cleanly and require manual action.
    // Exit 0 so a systemd unit does not restart-loop a permanent failure.
    if (code !== undefined && TERMINAL_ERESULTS.has(code)) {
      showError(`Resume aborted — ${label} is not auto-recoverable. Manual re-login required.`);
      telegram.send(`🛑 Idling stopped — ${label}. Manual re-login required.`);
      stopNotified = true;
      handleShutdown(0);
      return;
    }

    // Rate limited: back off hard. A fixed fast retry escalates the Steam
    // lockout (30min → hours → 24h), so this is capped much higher than usual.
    if (code !== undefined && RATE_LIMIT_ERESULTS.has(code)) {
      rateLimitCount += 1;
      if (rateLimitCount >= RATE_LIMIT_RETRY_LIMIT) {
        showError(`Resume failed after ${RATE_LIMIT_RETRY_LIMIT} rate-limited attempts: ${label}`);
        telegram.send(`🛑 Idling stopped — rate-limited ${RATE_LIMIT_RETRY_LIMIT}× (${label}).`);
        stopNotified = true;
        handleShutdown(1);
        return;
      }
      resumeTimer = setTimeout(attemptResume, backoffMs(rateLimitCount, RATE_LIMIT_BACKOFF_CAP_MS));
      return;
    }

    // Transient/network: bounded retries with exponential backoff.
    transientFailureCount += 1;
    if (transientFailureCount >= GENERAL_FAILURE_RETRY_LIMIT) {
      showError(`Resume failed after ${GENERAL_FAILURE_RETRY_LIMIT} attempts: ${label}`);
      telegram.send(
        `🛑 Idling stopped — failed to reconnect after ${GENERAL_FAILURE_RETRY_LIMIT}× (last error: ${label}).`
      );
      stopNotified = true;
      handleShutdown(1);
      return;
    }
    resumeTimer = setTimeout(attemptResume, backoffMs(transientFailureCount, BACKOFF_CAP_MS));
  }
}

// Re-establishes the gamesPlayed list and resumes the normal display loop.
// Idempotent: attemptResume's await and the onLoggedOn auto-relogin callback
// can race to call this; the guard prevents a duplicate resume (which would
// orphan the previous interval and send a second "resumed" notification).
function restoreIdling(): void {
  if (!isWaitingForResume) return;
  isWaitingForResume = false;
  stopNotified = false; // reset so the next stop event sends a fresh message
  transientFailureCount = 0;
  rateLimitCount = 0;
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  const now = new Date();
  for (const game of idlingGames) game.startTime = now;
  client.setGamesPlaying(idlingGames.map((g) => g.appid));
  showIdlingStatus(idlingGames, pausedGames, pausingGames);
  updateInterval = setInterval(() => {
    if (startTime && !isInEditMode) {
      tickRandomizer();
      showIdlingStatus(idlingGames, pausedGames, pausingGames);
    }
  }, 60000);

  if (selfInitiatedRelog) {
    selfInitiatedRelog = false;
    telegram.send('🔄 flush — playtime committed, session refreshed');
  } else {
    // Debounce: only announce a resume that actually holds. If the player is
    // still active, this reconnect is kicked again within seconds and
    // enterWaitingState cancels this timer (see RESUME_NOTIFY_GRACE_MS), so a
    // long play session collapses to a single paused/resumed pair.
    if (resumeNotifyTimer) clearTimeout(resumeNotifyTimer);
    resumeNotifyTimer = setTimeout(() => {
      resumeNotifyTimer = null;
      telegram.send(`▶️ Idling resumed — ${idlingGames.length} games`);
    }, RESUME_NOTIFY_GRACE_MS);
  }

  if (takeoverDriftPending) {
    if (lastGoodPlaytime) reportTakeoverDrift(lastGoodPlaytime);
    takeoverDriftPending = false;
  }
}

// One-shot, delayed comparison of the server's committed playtime against the
// last known-good value, to quantify how much of the pre-takeover tail survived.
// Observability only; reuses the zombie watchdog's baseline.
function reportTakeoverDrift(lastGood: { appid: number; playtime: number }): void {
  setTimeout(async () => {
    try {
      const now = await client.getPlaytimeForever(lastGood.appid);
      if (now === null) return;
      const delta = now - lastGood.playtime;
      const name = gamesById.get(lastGood.appid)?.name ?? `App ${lastGood.appid}`;
      const sign = delta >= 0 ? '+' : '';
      telegram.send(
        `📊 Post-takeover commit check (${name}): last-known ${lastGood.playtime}m → now ${now}m (Δ${sign}${delta}m).`
      );
    } catch {
      // Best-effort observability — a failed probe is not worth surfacing.
    }
  }, TAKEOVER_DRIFT_DELAY_MS);
}

function msUntilNextMidnight(): number {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - Date.now();
}

function scheduleDailyReport(): void {
  midnightTimer = setTimeout(() => {
    const report = formatDailyReport(
      idlingGames,
      pausedGames,
      pausingGames,
      dayStartAccumulatedMs,
      new Date(),
      isWaitingForResume
    );
    telegram.send(report);
    snapshotDayStart();
    scheduleDailyReport();
  }, msUntilNextMidnight());
}

// Captures each game's current accumulated playtime for tomorrow's "today gain" calculation
function snapshotDayStart(): void {
  dayStartAccumulatedMs.clear();
  const all = [...idlingGames, ...pausedGames, ...pausingGames];
  const now = Date.now();
  for (const game of all) {
    const isFrozen = isWaitingForResume || game.pauseUntil != null;
    const live = isFrozen
      ? game.accumulatedMs
      : game.accumulatedMs + (now - game.startTime.getTime());
    dayStartAccumulatedMs.set(game.appid, live);
  }
}

// Shared self-initiated relog used by the periodic flush and zombie recovery. A
// clean logOff commits the in-flight idle session; the disconnect→loggedOn
// handlers restore idling and clear the suppression flag.
function forceFlushRelog(): void {
  if (!client.isConnected) return;
  selfInitiatedRelog = true;
  try {
    client.relog();
  } catch {
    selfInitiatedRelog = false;
  }
}

// Mitigation A: periodically force a clean logOff+reconnect so the server folds
// the in-flight idle session into playtime_forever. Caps worst-case loss at
// FLUSH_INTERVAL_MS. Self-reschedules.
function scheduleFlush(): void {
  flushTimer = setTimeout(() => {
    const idle = !isWaitingForResume && !isInEditMode && !isShuttingDown;
    if (idle && idlingGames.length > 0) {
      forceFlushRelog();
    }
    scheduleFlush();
  }, FLUSH_INTERVAL_MS);
}

// Picks the app to probe: stick with the current baseline app while it is still
// continuously idling, otherwise fall back to the first idling game (which forces
// a re-baseline rather than a false zombie verdict).
function pickProbeApp(): IdlingGame | null {
  if (zombieBaseline) {
    const still = idlingGames.find((g) => g.appid === zombieBaseline!.appid);
    if (still) return still;
  }
  return idlingGames[0] ?? null;
}

// Mitigation B: confirm the server's playtime is actually climbing for a
// continuously-idled app. If a full window passes with no increase, commits are
// silently dying (zombie session) → alert + force a relog. Self-reschedules.
async function runZombieCheck(): Promise<void> {
  if (isWaitingForResume || isInEditMode || isShuttingDown || !client.isConnected) return;
  if (idlingGames.length === 0) {
    zombieBaseline = null;
    return;
  }

  const probe = pickProbeApp();
  if (!probe) {
    zombieBaseline = null;
    return;
  }

  let playtime: number | null;
  try {
    playtime = await client.getPlaytimeForever(probe.appid);
  } catch {
    return; // transient fetch error — keep the baseline, try again next tick
  }
  if (playtime === null) {
    zombieBaseline = null; // inconclusive (app absent from response)
    return;
  }

  const now = Date.now();

  if (!zombieBaseline || zombieBaseline.appid !== probe.appid) {
    zombieBaseline = { appid: probe.appid, playtime, at: now };
    lastGoodPlaytime = { appid: probe.appid, playtime };
    zombieStrike = 0;
    return;
  }

  if (playtime > zombieBaseline.playtime) {
    zombieBaseline = { appid: probe.appid, playtime, at: now };
    lastGoodPlaytime = { appid: probe.appid, playtime };
    zombieStrike = 0;
    return;
  }

  // Same app, continuously idling, a full window with no server-side increase.
  if (zombieStrike === 0) {
    // First strike: a healthy session may just be slow to commit. Force a flush
    // relog (which commits) and re-check next window before alarming. Keep the
    // baseline so the next probe compares against the same value.
    zombieStrike = 1;
    forceFlushRelog();
    return;
  }

  // Second strike: a forced relog already failed to produce a commit → real
  // zombie. Alert and force another reconnect, then reset.
  telegram.send('⚠️ Zombie session — playtime not committing after a relog. Forcing reconnect.');
  zombieStrike = 0;
  zombieBaseline = null;
  forceFlushRelog();
}

function scheduleZombieCheck(): void {
  zombieTimer = setTimeout(async () => {
    await runZombieCheck();
    scheduleZombieCheck();
  }, ZOMBIE_CHECK_INTERVAL_MS);
}

// Main entry point that orchestrates the application flow
async function main(): Promise<void> {
  if (isSetupTelegram) {
    try {
      await runTelegramSetup();
      process.exit(0);
    } catch (err) {
      showError((err as Error).message);
      process.exit(1);
    }
  }

  process.on('SIGINT', () => handleShutdown(0));
  process.on('SIGTERM', () => handleShutdown(0));
  process.on('uncaughtException', handleCrash);
  process.on('unhandledRejection', handleCrash);

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
    gamesById = new Map(allGames.map((g) => [g.appid, g]));
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
    ? gamesById.get(exemptAppId)?.name ?? null
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

  if (!telegram.hasFile()) {
    const wantsTelegram = await confirm({
      message: 'Configure Telegram notifications now? You can do this later with --setup-telegram.',
      default: true,
    });
    if (wantsTelegram) {
      try {
        await runTelegramSetup();
      } catch (err) {
        console.log(chalk.yellow(`Telegram setup failed: ${(err as Error).message}`));
        console.log(chalk.gray('Continuing without notifications. Run --setup-telegram to retry.'));
      }
    } else {
      saveTelegramDisabled();
    }
    telegram.reload();
  }

  const spinner = ora('Fetching your game library...').start();
  try {
    allGames = await client.getOwnedGames();
    gamesById = new Map(allGames.map((g) => [g.appid, g]));
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
  if (isWaitingForResume) {
    showError('Edit disabled while waiting for resume');
    return;
  }
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
        const steamGame = gamesById.get(selection.appid);
        const isExempt = selection.appid === newExemptAppId;
        keptIdlingGames.push(createIdlingGame(selection, steamGame, isExempt));
      }
    }

    idlingGames = keptIdlingGames;
    pausedGames = keptPausedGames;
    pausingGames = keptPausingGames;
    exemptAppId = newExemptAppId;

    if (!isWaitingForResume) {
      client.setGamesPlaying(idlingGames.map((g) => g.appid));
    }
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
    const steamGame = gamesById.get(game.appid);
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
    const isTakeover = TAKEOVER_ERESULTS.has(eresult);
    if (isTakeover && !selfInitiatedRelog && lastGoodPlaytime) takeoverDriftPending = true;
    const reason = isTakeover
      ? 'player active on this account elsewhere'
      : `disconnected (${msg}, eresult ${eresult})`;
    console.log(`\nDisconnected from Steam: ${msg} (${eresult})`);
    enterWaitingState(reason);
  });

  client.onError((err) => {
    const isTakeover = isTakeoverError(err);
    if (isTakeover && !selfInitiatedRelog && lastGoodPlaytime) takeoverDriftPending = true;
    const reason = isTakeover
      ? 'player active on this account elsewhere'
      : `Steam error: ${err.message}`;
    console.log(`\nSteam error: ${err.message}`);
    enterWaitingState(reason);
  });

  // Catches steam-user's silent auto-relogins so we restore idling promptly
  // instead of waiting for the 60s attemptResume tick (which would then race
  // with the now-connected client and crash).
  client.onLoggedOn(() => {
    if (isWaitingForResume) {
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
      transientFailureCount = 0;
      rateLimitCount = 0;
      restoreIdling();
    }
  });

  snapshotDayStart();
  scheduleDailyReport();
  scheduleFlush();
  scheduleZombieCheck();

  const exemptName = exemptAppId
    ? gamesById.get(exemptAppId)?.name ?? null
    : null;
  const startedSuffix = exemptName ? ` (exempt: ${exemptName})` : '';
  telegram.send(`▶️ Idling started — ${idlingGames.length} games${startedSuffix}`);
}

// Graceful shutdown handler that saves state and logs out. exitCode lets the
// auto-resume give-up paths signal a restartable failure (1) vs a clean stop (0).
function handleShutdown(exitCode = 0): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n');

  if (resumeTimer) {
    clearTimeout(resumeTimer);
    resumeTimer = null;
  }
  if (resumeNotifyTimer) {
    clearTimeout(resumeNotifyTimer);
    resumeNotifyTimer = null;
  }
  if (midnightTimer) {
    clearTimeout(midnightTimer);
    midnightTimer = null;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (zombieTimer) {
    clearTimeout(zombieTimer);
    zombieTimer = null;
  }
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

  // Fallback "quit by user" only fires when no other site has already sent a stop message
  if (!stopNotified) {
    telegram.send('🛑 Idling stopped — quit by user');
  }

  showGoodbye();
  // Grace so the clean logOff socket write (the playtime-commit trigger) and the
  // Telegram fetch can land before the process exits.
  setTimeout(() => process.exit(exitCode), SHUTDOWN_FLUSH_GRACE_MS);
}

// Mitigation C: last-resort flush on a fatal error. Best-effort stop+logout to
// salvage the in-flight session's playtime tail before exiting.
function handleCrash(err: unknown): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.error('\nFatal error:', err);

  if (resumeTimer) clearTimeout(resumeTimer);
  if (resumeNotifyTimer) clearTimeout(resumeNotifyTimer);
  if (midnightTimer) clearTimeout(midnightTimer);
  if (flushTimer) clearTimeout(flushTimer);
  if (zombieTimer) clearTimeout(zombieTimer);
  if (updateInterval) clearInterval(updateInterval);

  try {
    if (isIdling) client.stopPlaying();
  } catch {
    // ignore — best effort
  }
  try {
    if (client.isLoggedIn) client.logout();
  } catch {
    // ignore — best effort
  }

  if (!stopNotified) {
    const message = err instanceof Error ? err.message : String(err);
    telegram.send(`🛑 Idling stopped — crashed (${message}).`);
  }

  setTimeout(() => process.exit(1), CRASH_FLUSH_GRACE_MS);
}

main().catch((err) => {
  showError(err.message);
  process.exit(1);
});
