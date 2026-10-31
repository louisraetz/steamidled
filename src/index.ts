#!/usr/bin/env node

import * as readline from 'node:readline';
import { createRequire } from 'node:module';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import SteamUser from 'steam-user';
import { SteamClient } from './steam/client.js';
import {
  loginWithQR,
  loginWithCredentials,
  loginWithStoredCredentials,
  hasStoredLogin,
  clearCredentials,
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
import { loadCredentials, saveCredentials } from './storage/credentials.js';
import { TelegramNotifier, runTelegramSetup, saveTelegramDisabled } from './notifications/telegram.js';
import { formatDailyReport } from './notifications/dailyReport.js';
import { MAX_IDLE_GAMES, IS_HEADLESS } from './constants.js';
import { createSpinner } from './ui/spinner.js';
import type { SteamGame, GameSelection, IdlingGame, LoginResult } from './types/index.js';

const KNOWN_FLAGS = ['--headless', '--setup-telegram', '--logout', '--help', '-h', '--version', '-v'];
const args = process.argv.slice(2);
const isHeadless = IS_HEADLESS;
const isSetupTelegram = args.includes('--setup-telegram');
const isLogout = args.includes('--logout');
const isHelp = args.includes('--help') || args.includes('-h');
const isVersion = args.includes('--version') || args.includes('-v');
const unknownFlags = args.filter((a) => !KNOWN_FLAGS.includes(a));

const HOURS_MS = 60 * 60 * 1000;
const TAKEOVER_ERESULTS = new Set<number>([6, 34]); // LoggedInElsewhere, LogonSessionReplaced
const RESUME_RETRY_MS = 60_000;
const RESUME_NOTIFY_GRACE_MS = 90_000;
const PAUSE_NOTIFY_GRACE_MS = 30_000;
const TAKEOVER_RETRY_MS = 5 * 60_000;
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
// Subset of TERMINAL_ERESULTS where the stored refresh token itself is dead;
// delete it so the next interactive start goes straight to a fresh login.
const INVALID_TOKEN_ERESULTS = new Set<number>([5, 15, 26, 27, 126]);
const BACKOFF_BASE_MS = 60_000;
const BACKOFF_CAP_MS = 15 * 60 * 1000;
const RATE_LIMIT_BACKOFF_CAP_MS = 30 * 60 * 1000;
const RATE_LIMIT_MIN_WAIT_MS = 10 * 60 * 1000;
const FLUSH_INTERVAL_MS = 4 * HOURS_MS;
const ZOMBIE_CHECK_INTERVAL_MS = 90 * 60 * 1000;
const CRASH_FLUSH_GRACE_MS = 2000;
const ABORT_SETTLE_MS = 5000;
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
let resumeNotifyTimer: NodeJS.Timeout | null = null;
let pauseNotifyTimer: NodeJS.Timeout | null = null;
let pauseNotified = false;
let pauseEpisodeStart = 0;
let midnightTimer: NodeJS.Timeout | null = null;
let flushTimer: NodeJS.Timeout | null = null;
let zombieTimer: NodeJS.Timeout | null = null;
let isInEditMode = false;
let isWaitingForResume = false;
let waitingReason = '';
let isShuttingDown = false;
let stopNotified = false;
let playingBlocked = false;
let accountName: string = '';
let exemptAppId: number | null = null;
let dayStartAccumulatedMs = new Map<number, number>();
let transientFailureCount = 0;
let rateLimitCount = 0;
let selfInitiatedRelog = false;
let zombieBaseline: { appid: number; playtime: number; at: number } | null = null;
let lastGoodPlaytime: { appid: number; playtime: number } | null = null;
let takeoverDriftPending = false;
let zombieStrike = 0;
const unprobeableAppIds = new Set<number>();

function bankElapsed(games: IdlingGame[], now = new Date()): void {
  for (const game of games) {
    game.accumulatedMs += now.getTime() - game.startTime.getTime();
    game.startTime = now;
  }
}

function isFrozen(): boolean {
  return isWaitingForResume || playingBlocked;
}

// "3m" / "2h 05m" for Telegram copy
function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
}

// Announces a pause once per outage episode: delayed so a blip that reconnects
// within the grace window stays silent, and never repeated while an announced
// episode is still flapping (kicked again inside the resume grace).
function schedulePauseNotification(reason: string): void {
  if (pauseNotified || pauseNotifyTimer) return;
  pauseEpisodeStart = Date.now();
  pauseNotifyTimer = setTimeout(() => {
    pauseNotifyTimer = null;
    pauseNotified = true;
    telegram.send(`⏸️ Idling paused — ${reason}. Auto-retrying.`);
  }, PAUSE_NOTIFY_GRACE_MS);
}

function scheduleResumeNotification(): void {
  if (!pauseNotified) return;
  if (resumeNotifyTimer) clearTimeout(resumeNotifyTimer);
  resumeNotifyTimer = setTimeout(() => {
    resumeNotifyTimer = null;
    pauseNotified = false;
    const downtime = formatDuration(Date.now() - pauseEpisodeStart);
    telegram.send(`▶️ Idling resumed after ${downtime} — ${idlingGames.length} games`);
  }, RESUME_NOTIFY_GRACE_MS);
}

function renderStatus(): void {
  showIdlingStatus(idlingGames, pausedGames, pausingGames, {
    waitingReason: isWaitingForResume ? waitingReason : null,
    playingBlocked,
    showKeyHints: !isHeadless,
  });
}

function startDisplayLoop(): void {
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(() => {
    if (!startTime || isInEditMode) return;
    const changed = tickRandomizer();
    if (changed || process.stdout.isTTY) renderStatus();
  }, 60000);
}

function stopDisplayLoop(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

function randomIdlePhaseMs(): number {
  return Math.floor((168 + Math.random() * 552) * HOURS_MS);
}

function randomCooldownMs(): number {
  return Math.floor((100 + Math.random() * 100) * HOURS_MS);
}

function backoffMs(attempt: number, capMs: number): number {
  const exp = Math.min(capMs, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
  return Math.floor(exp / 2 + Math.random() * (exp / 2));
}

function tickRandomizer(): boolean {
  if (isFrozen()) return false;
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
      game.startTime = now;
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
  return mutated;
}

function isTakeoverError(err: Error & { eresult?: number }): boolean {
  if (err.eresult !== undefined && TAKEOVER_ERESULTS.has(err.eresult)) return true;
  return /loggedinelsewhere|logonsessionreplaced/i.test(err.message ?? '');
}

// Freezes elapsed time and arms the resume poller after any disconnect or Steam error
function enterWaitingState(reason: string, isTakeover = false): void {
  if (isWaitingForResume || isShuttingDown) return;
  isWaitingForResume = true;
  waitingReason = reason;
  if (resumeNotifyTimer) {
    clearTimeout(resumeNotifyTimer);
    resumeNotifyTimer = null;
  }
  if (!playingBlocked) bankElapsed(idlingGames);
  stopDisplayLoop();
  if (!isInEditMode) renderStatus();
  // A self-initiated relog (flush/zombie recovery) suppresses the pause message;
  // restoreIdling emits a single quiet "🔄 flush" line instead.
  if (!selfInitiatedRelog) schedulePauseNotification(reason);
  resumeTimer = setTimeout(attemptResume, isTakeover ? TAKEOVER_RETRY_MS : RESUME_RETRY_MS);
}

async function attemptResume(): Promise<void> {
  resumeTimer = null;
  if (isShuttingDown) return;

  if (client.isConnected) {
    transientFailureCount = 0;
    rateLimitCount = 0;
    restoreIdling();
    return;
  }

  if (client.isReconnecting) {
    resumeTimer = setTimeout(attemptResume, RESUME_RETRY_MS);
    return;
  }
  if (client.isConnecting) {
    client.abortPendingConnect();
    resumeTimer = setTimeout(attemptResume, ABORT_SETTLE_MS);
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
    const refreshToken = client.currentRefreshToken ?? credentials.refreshToken;
    await client.loginWithRefreshToken(refreshToken, credentials.accountName);
    transientFailureCount = 0;
    rateLimitCount = 0;
    restoreIdling();
  } catch (err) {
    const e = err as Error & { eresult?: number };
    const code = e.eresult;
    const label =
      code !== undefined ? SteamUser.EResult[code] ?? `eresult ${code}` : e.message || 'unknown';

    if (selfInitiatedRelog) {
      selfInitiatedRelog = false;
      schedulePauseNotification(`flush relog failed to reconnect (${label})`);
    }

    if (code !== undefined && TERMINAL_ERESULTS.has(code)) {
      showError(`Resume aborted — ${label} is not auto-recoverable. Manual re-login required.`);
      telegram.send(`🛑 Idling stopped — ${label}. Manual re-login required.`);
      stopNotified = true;
      if (INVALID_TOKEN_ERESULTS.has(code)) clearCredentials();
      handleShutdown(0);
      return;
    }

    if (code !== undefined && RATE_LIMIT_ERESULTS.has(code)) {
      rateLimitCount += 1;
      if (rateLimitCount >= RATE_LIMIT_RETRY_LIMIT) {
        showError(`Resume failed after ${RATE_LIMIT_RETRY_LIMIT} rate-limited attempts: ${label}`);
        telegram.send(`🛑 Idling stopped — rate-limited ${RATE_LIMIT_RETRY_LIMIT}× (${label}).`);
        stopNotified = true;
        handleShutdown(1);
        return;
      }
      resumeTimer = setTimeout(
        attemptResume,
        Math.max(RATE_LIMIT_MIN_WAIT_MS, backoffMs(rateLimitCount, RATE_LIMIT_BACKOFF_CAP_MS))
      );
      return;
    }

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

function restoreIdling(): void {
  if (!isWaitingForResume) return;
  if (isShuttingDown) {
    client.logout();
    return;
  }
  isWaitingForResume = false;
  waitingReason = '';
  transientFailureCount = 0;
  rateLimitCount = 0;
  // A fresh session starts unblocked; Steam re-reports a block via playingState
  // right after logon, which handlePlayingState turns into a transition. Games
  // paused by a block before the disconnect must rejoin now: Steam sends no
  // "unblocked" event on logon, and its echo after gamesPlayed is not one either.
  playingBlocked = false;
  const now = new Date();
  releasePausedGames(now);
  for (const game of idlingGames) game.startTime = now;
  client.setGamesPlaying(idlingGames.map((g) => g.appid));
  if (!isInEditMode) {
    renderStatus();
    startDisplayLoop();
  }

  if (pauseNotifyTimer) {
    clearTimeout(pauseNotifyTimer);
    pauseNotifyTimer = null;
  }
  if (selfInitiatedRelog) {
    selfInitiatedRelog = false;
    telegram.send('🔄 flush — playtime committed, session refreshed');
  }
  scheduleResumeNotification();

  if (takeoverDriftPending) {
    if (lastGoodPlaytime) reportTakeoverDrift(lastGoodPlaytime);
    takeoverDriftPending = false;
  }
}

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
    const endedDay = new Date();
    endedDay.setDate(endedDay.getDate() - 1);
    const report = formatDailyReport(
      idlingGames,
      pausedGames,
      pausingGames,
      dayStartAccumulatedMs,
      endedDay,
      isFrozen()
    );
    telegram.send(report);
    snapshotDayStart();
    scheduleDailyReport();
  }, msUntilNextMidnight());
}

function snapshotDayStart(): void {
  dayStartAccumulatedMs.clear();
  const now = Date.now();
  const frozen = isFrozen();
  for (const game of idlingGames) {
    const live = frozen
      ? game.accumulatedMs
      : game.accumulatedMs + (now - game.startTime.getTime());
    dayStartAccumulatedMs.set(game.appid, live);
  }
  for (const game of [...pausedGames, ...pausingGames]) {
    dayStartAccumulatedMs.set(game.appid, game.accumulatedMs);
  }
}

function forceFlushRelog(): void {
  if (!client.isConnected || selfInitiatedRelog) return;
  selfInitiatedRelog = true;
  try {
    client.relog();
  } catch {
    selfInitiatedRelog = false;
  }
}

function scheduleFlush(): void {
  flushTimer = setTimeout(() => {
    const idle = !isWaitingForResume && !isInEditMode && !isShuttingDown && !playingBlocked;
    if (idle && idlingGames.length > 0) {
      forceFlushRelog();
    }
    scheduleFlush();
  }, FLUSH_INTERVAL_MS);
}

function pickProbeApp(): IdlingGame | null {
  if (zombieBaseline) {
    const still = idlingGames.find((g) => g.appid === zombieBaseline!.appid);
    if (still) return still;
  }
  return idlingGames.find((g) => !unprobeableAppIds.has(g.appid)) ?? null;
}

async function runZombieCheck(): Promise<void> {
  if (isFrozen() || isInEditMode || isShuttingDown || selfInitiatedRelog || !client.isConnected) {
    return;
  }
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
    return;
  }
  if (isFrozen() || isInEditMode || isShuttingDown || selfInitiatedRelog || !client.isConnected) {
    return;
  }
  if (playtime === null) {
    unprobeableAppIds.add(probe.appid);
    zombieBaseline = null;
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

  if (zombieStrike === 0) {
    zombieStrike = 1;
    forceFlushRelog();
    return;
  }

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

function showHelp(): void {
  console.log(`steamidled — Steam game idler CLI and daemon

Usage:
  steamidled                   Interactive mode (login, pick games, idle)
  steamidled --headless        Headless mode: auto-login and idle your favorites
  steamidled --setup-telegram  (Re)configure Telegram notifications
  steamidled --logout          Forget the saved Steam login
  steamidled --version, -v     Print version
  steamidled --help, -h        Show this help

Config lives in ~/.steam-idler/ (credentials, favorites, telegram).`);
}

function packageVersion(): string {
  const require = createRequire(import.meta.url);
  return (require('../package.json') as { version: string }).version;
}

async function main(): Promise<void> {
  if (isHelp) {
    showHelp();
    process.exit(0);
  }
  if (isVersion) {
    console.log(packageVersion());
    process.exit(0);
  }
  if (unknownFlags.length > 0) {
    showError(`Unknown option: ${unknownFlags.join(' ')}`);
    showHelp();
    process.exit(2);
  }

  if (isLogout) {
    const had = hasStoredLogin();
    clearCredentials();
    console.log(had ? 'Saved Steam login removed.' : 'No saved Steam login to remove.');
    process.exit(0);
  }

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
  process.on('SIGHUP', () => handleShutdown(0));
  process.on('uncaughtException', handleCrash);
  process.on('unhandledRejection', handleCrash);

  client.onRefreshToken((refreshToken) => {
    const stored = loadCredentials();
    const name = stored?.accountName ?? accountName;
    if (!name) return;
    if (!saveCredentials({ ...stored, accountName: name, refreshToken })) {
      telegram.send(
        '⚠️ Steam renewed the login token but it could not be saved — the next restart will need an interactive login.'
      );
    }
  });

  if (isHeadless) {
    await runHeadless();
  } else {
    await runInteractive();
  }

  await new Promise<void>(() => {});
}

const HEADLESS_EXIT_TRANSIENT = 1;
const HEADLESS_EXIT_CONFIG = 2;

async function failHeadless(message: string, exitCode: number): Promise<never> {
  showError(message);
  const sent = telegram.send(`🛑 Headless start failed — ${message}`);
  try {
    if (client.isConnected) client.logout();
  } catch {
  }
  const grace = new Promise((resolve) => setTimeout(resolve, SHUTDOWN_FLUSH_GRACE_MS));
  await Promise.all([grace, sent]);
  process.exit(exitCode);
}

async function runHeadless(): Promise<void> {
  if (!hasStoredLogin()) {
    await failHeadless('No stored login found. Run interactively first to log in.', HEADLESS_EXIT_CONFIG);
  }

  let loginResult = await loginWithStoredCredentials(client);
  let rateLimitedAttempts = 0;
  while (!loginResult.success && loginResult.eresult !== undefined && RATE_LIMIT_ERESULTS.has(loginResult.eresult)) {
    rateLimitedAttempts += 1;
    if (rateLimitedAttempts >= RATE_LIMIT_RETRY_LIMIT) break;
    const waitMs = Math.max(RATE_LIMIT_MIN_WAIT_MS, backoffMs(rateLimitedAttempts, RATE_LIMIT_BACKOFF_CAP_MS));
    console.log(chalk.yellow(`Rate limited by Steam — retrying login in ${formatDuration(waitMs)}.`));
    if (rateLimitedAttempts === 1) telegram.send('⏸️ Headless start rate-limited by Steam — waiting before retrying.');
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    loginResult = await loginWithStoredCredentials(client);
  }
  if (!loginResult.success) {
    const terminal = loginResult.eresult !== undefined && TERMINAL_ERESULTS.has(loginResult.eresult);
    await failHeadless(
      loginResult.error || 'Unknown error',
      terminal ? HEADLESS_EXIT_CONFIG : HEADLESS_EXIT_TRANSIENT
    );
  }
  accountName = loginResult.accountName!;

  const gamesSpinner = createSpinner('Fetching your game library...').start();
  try {
    allGames = await client.getOwnedGames();
    gamesById = new Map(allGames.map((g) => [g.appid, g]));
    gamesSpinner.succeed(`Found ${allGames.length} games`);
  } catch (err) {
    gamesSpinner.fail('Failed to fetch games');
    await failHeadless((err as Error).message, HEADLESS_EXIT_TRANSIENT);
  }

  const favoriteIds = loadFavorites(accountName);
  if (favoriteIds.length === 0) {
    await failHeadless(
      'No favorites configured. Run interactively first to set favorites.',
      HEADLESS_EXIT_CONFIG
    );
  }

  exemptAppId = loadExempt(accountName);

  const matchingGames: GameSelection[] = allGames
    .filter((g) => favoriteIds.includes(g.appid))
    .map((g) => ({ appid: g.appid, name: g.name }));

  if (matchingGames.length === 0) {
    if (!client.ownershipCacheComplete) {
      await failHeadless(
        'No matching games found — library incomplete (license data timed out). Retrying.',
        HEADLESS_EXIT_TRANSIENT
      );
    }
    await failHeadless('No matching games found for your favorites.', HEADLESS_EXIT_CONFIG);
  }

  const selectedGames = matchingGames.slice(0, MAX_IDLE_GAMES);
  if (matchingGames.length > MAX_IDLE_GAMES) {
    console.log(
      chalk.yellow(
        `${matchingGames.length} favorites exceed the ${MAX_IDLE_GAMES}-game limit — idling the first ${MAX_IDLE_GAMES}.`
      )
    );
  }

  const exemptName =
    exemptAppId && selectedGames.some((g) => g.appid === exemptAppId)
      ? gamesById.get(exemptAppId)?.name ?? null
      : null;
  console.log(`Starting ${selectedGames.length} favorite game(s)...`);
  if (exemptName) console.log(`Exempt from randomizer: ${exemptName}`);
  startIdling(selectedGames);
}

async function runInteractive(): Promise<void> {
  showWelcome(packageVersion());

  let loginResult = await handleLogin();
  while (!loginResult.success) {
    showLoginError(loginResult.error || 'Unknown error');
    loginResult = await handleLogin();
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

  const spinner = createSpinner('Fetching your game library...').start();
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

  const { selectedGames, exemptAppId: selectedExempt, aborted } = await selectGames(
    allGames,
    accountName
  );

  if (aborted) {
    handleShutdown(0);
    return;
  }

  if (selectedGames.length === 0) {
    showError('No games selected');
    handleShutdown(1);
    return;
  }

  exemptAppId = selectedExempt;
  startIdling(selectedGames);
}

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

function setupKeyboardInput(): void {
  if (isHeadless) return;
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on('keypress', async (str, key) => {
      if (isShuttingDown) return;
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

function getGameCurrentSelection(): GameSelection[] {
  return [...idlingGames, ...pausedGames, ...pausingGames].map((g) => ({
    appid: g.appid,
    name: g.name,
  }));
}

async function enterEditMode(): Promise<void> {
  if (isWaitingForResume) {
    showError('Edit disabled while waiting for resume');
    return;
  }
  isInEditMode = true;

  stopDisplayLoop();
  if (!playingBlocked) bankElapsed(idlingGames);

  console.clear();

  const currentSelection = getGameCurrentSelection();
  const {
    selectedGames: newSelection,
    exemptAppId: newExemptAppId,
    aborted,
  } = await selectGames(allGames, accountName, currentSelection);

  if (aborted || isShuttingDown) {
    isInEditMode = false;
    handleShutdown(0);
    return;
  }

  if (newSelection.length === 0) {
    showError('No games selected - keeping current selection');
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

    // Kept idling games keep their running clock: the selector time was idled
    // too. A block or disconnect that landed meanwhile already owns startTime.
    for (const game of idlingGames) {
      if (newAppIds.has(game.appid)) {
        applyExemptChange(game);
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
  }

  // Always re-send on the way out, selection changed or not: an unblock that
  // arrived while the selector was open deferred its re-send to here, and Steam
  // does not restore a blocked session's list on its own.
  if (!isWaitingForResume) {
    client.setGamesPlaying(idlingGames.map((g) => g.appid));
  }

  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  isInEditMode = false;

  if (!startTime) return;
  renderStatus();
  // A disconnect that landed while the selector was open leaves us waiting:
  // keep the clocks frozen and let restoreIdling restart the loop.
  if (!isWaitingForResume) startDisplayLoop();
}

function releasePausedGames(now: Date): void {
  const restoredIdling: IdlingGame[] = [];
  const restoredCooling: IdlingGame[] = [];
  for (const game of pausedGames) {
    if (game.pauseUntil && now < game.pauseUntil) {
      restoredCooling.push(game);
      continue;
    }
    if (game.pauseUntil) {
      game.pauseUntil = null;
      if (game.nextPauseAtMs !== null) {
        game.nextPauseAtMs = game.accumulatedMs + randomIdlePhaseMs();
      }
    }
    restoredIdling.push(game);
  }
  idlingGames.push(...restoredIdling);
  pausingGames.push(...restoredCooling);
  pausedGames = [];
}

function handlePlayingState(blocked: boolean, playingApp: number): void {
  if (blocked === playingBlocked) return;
  playingBlocked = blocked;
  const now = new Date();

  if (blocked) {
    if (!isWaitingForResume) bankElapsed(idlingGames, now);
    zombieBaseline = null;
    zombieStrike = 0;

    const idleIndex = idlingGames.findIndex((g) => g.appid === playingApp);
    if (idleIndex !== -1) {
      const [pausedGame] = idlingGames.splice(idleIndex, 1);
      pausedGames.push(pausedGame);
    } else {
      const coolingIndex = pausingGames.findIndex((g) => g.appid === playingApp);
      if (coolingIndex !== -1) {
        const [pausedGame] = pausingGames.splice(coolingIndex, 1);
        pausedGames.push(pausedGame);
      }
    }
  } else {
    releasePausedGames(now);
    if (!isWaitingForResume) {
      for (const game of idlingGames) game.startTime = now;
    }
  }

  if (isInEditMode || isWaitingForResume) return;
  if (!blocked) client.setGamesPlaying(idlingGames.map((g) => g.appid));
  renderStatus();
}

function startIdling(games: GameSelection[]): void {
  isIdling = true;
  startTime = new Date();

  idlingGames = games.map((game) => {
    const steamGame = gamesById.get(game.appid);
    return createIdlingGame(game, steamGame, game.appid === exemptAppId);
  });
  pausedGames = [];
  pausingGames = [];

  playingBlocked = client.isPlayingBlocked;

  const appIds = games.map((g) => g.appid);
  client.setGamesPlaying(appIds);

  setupKeyboardInput();

  renderStatus();
  startDisplayLoop();

  client.onPlayingState(handlePlayingState);

  client.onDisconnected((eresult, msg) => {
    if (isShuttingDown) return;
    const isTakeover = TAKEOVER_ERESULTS.has(eresult);
    if (isTakeover) selfInitiatedRelog = false;
    if (isTakeover && lastGoodPlaytime) takeoverDriftPending = true;
    const reason = selfInitiatedRelog
      ? 'flushing playtime (scheduled relog)'
      : isTakeover
      ? 'player active on this account elsewhere'
      : `disconnected (${msg}, eresult ${eresult})`;
    if (!isInEditMode && !selfInitiatedRelog) {
      console.log(`\nDisconnected from Steam: ${msg} (${eresult})`);
    }
    enterWaitingState(reason, isTakeover);
  });

  client.onError((err) => {
    if (isShuttingDown) return;
    const isTakeover = isTakeoverError(err);
    if (isTakeover) selfInitiatedRelog = false;
    if (isTakeover && lastGoodPlaytime) takeoverDriftPending = true;
    const reason = isTakeover
      ? 'player active on this account elsewhere'
      : `Steam error: ${err.message}`;
    if (!isInEditMode) console.log(`\nSteam error: ${err.message}`);
    enterWaitingState(reason, isTakeover);
  });

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

  // Announce the exempt game only if it is actually among the idled ones
  const exemptName = idlingGames.find((g) => g.nextPauseAtMs === null)?.name ?? null;
  const startedSuffix = exemptName ? ` (exempt: ${exemptName})` : '';
  telegram.send(`▶️ Idling started — ${idlingGames.length} games${startedSuffix}`);

  // A kick or drop between login and here (e.g. while the selector was open)
  // had no handler yet; without this the screen would say "Idling" forever
  // while nothing is played and no resume is ever attempted.
  if (!client.isConnected) {
    enterWaitingState('disconnected before idling started');
  }
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
  if (pauseNotifyTimer) {
    clearTimeout(pauseNotifyTimer);
    pauseNotifyTimer = null;
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
  stopDisplayLoop();

  try {
    if (isIdling) {
      client.stopPlaying();
      isIdling = false;
    }
    if (client.isLoggedIn || client.isConnected) {
      client.logout();
    }
  } catch (err) {
    console.error('Logout failed:', (err as Error).message);
  }

  const finalMessage =
    !stopNotified && startTime ? telegram.send('🛑 Idling stopped — quit by user') : Promise.resolve();

  showGoodbye();
  const grace = new Promise((resolve) => setTimeout(resolve, SHUTDOWN_FLUSH_GRACE_MS));
  void Promise.all([grace, finalMessage]).then(() => process.exit(exitCode));
}

function handleCrash(err: unknown): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.error('\nFatal error:', err);

  if (resumeTimer) clearTimeout(resumeTimer);
  if (resumeNotifyTimer) clearTimeout(resumeNotifyTimer);
  if (pauseNotifyTimer) clearTimeout(pauseNotifyTimer);
  if (midnightTimer) clearTimeout(midnightTimer);
  if (flushTimer) clearTimeout(flushTimer);
  if (zombieTimer) clearTimeout(zombieTimer);
  if (updateInterval) clearInterval(updateInterval);

  try {
    if (isIdling) client.stopPlaying();
  } catch {
  }
  try {
    if (client.isLoggedIn || client.isConnected) client.logout();
  } catch {
  }

  const message = err instanceof Error ? err.message : String(err);
  const finalMessage = stopNotified
    ? Promise.resolve()
    : telegram.send(
        startTime
          ? `🛑 Idling stopped — crashed (${message}).`
          : `🛑 steamidled crashed before idling started (${message}).`
      );

  const grace = new Promise((resolve) => setTimeout(resolve, CRASH_FLUSH_GRACE_MS));
  void Promise.all([grace, finalMessage]).then(() => process.exit(1));
}

main().catch((err: Error) => {
  if (err.name === 'ExitPromptError') {
    showGoodbye();
    process.exit(0);
  }
  showError(err.message);
  process.exit(1);
});
