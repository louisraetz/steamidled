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
import { loadFavorites, loadExempt, saveFavorites, saveExempt } from './storage/favorites.js';
import { loadCredentials, saveCredentials } from './storage/credentials.js';
import { getSettings, updateSettings } from './storage/settings.js';
import { createSchedule } from './core/schedule.js';
import { createSessionControls } from './core/session-controls.js';
import { TelegramNotifier, saveTelegramDisabled } from './notifications/telegram.js';
import { runTelegramSetup } from './notifications/telegramSetup.js';
import { dayBefore, formatDailyReport, formatReportTime, reportPeriodLabel } from './notifications/dailyReport.js';
import {
  MAX_IDLE_GAMES,
  IS_HEADLESS,
  IS_WEB,
  TAKEOVER_ERESULTS,
  TERMINAL_ERESULTS,
  RATE_LIMIT_ERESULTS,
  INVALID_TOKEN_ERESULTS,
  WEB_DEFAULT_PORT,
} from './constants.js';
import { createSpinner } from './ui/spinner.js';
import { log } from './logging/logger.js';
import { countLabel, formatDuration, formatWait } from './utils/format.js';
import type { SteamGame, GameSelection, IdlingGame, LoginResult } from './types/index.js';
import type { Engine, EngineState, ResumeInfo, ResumeKind, SessionStart, WebBridge } from './web/engine.js';

const KNOWN_FLAGS = [
  '--headless',
  '--web',
  '--setup-telegram',
  '--logout',
  '--help',
  '-h',
  '--version',
  '-v',
];
const args = process.argv.slice(2);
const isHeadless = IS_HEADLESS;
const isSetupTelegram = args.includes('--setup-telegram');
const isLogout = args.includes('--logout');
const isHelp = args.includes('--help') || args.includes('-h');
const isVersion = args.includes('--version') || args.includes('-v');
const unknownFlags = args.filter((a) => !KNOWN_FLAGS.includes(a));

const HOURS_MS = 60 * 60 * 1000;
const RESUME_RETRY_MS = 60_000;
const RESUME_NOTIFY_GRACE_MS = 90_000;
const PAUSE_NOTIFY_GRACE_MS = 30_000;
const TAKEOVER_RETRY_MS = 5 * 60_000;
const GENERAL_FAILURE_RETRY_LIMIT = 30;
const RATE_LIMIT_RETRY_LIMIT = 10;
const BACKOFF_BASE_MS = 60_000;
const BACKOFF_CAP_MS = 15 * 60 * 1000;
const RATE_LIMIT_BACKOFF_CAP_MS = 30 * 60 * 1000;
const RATE_LIMIT_MIN_WAIT_MS = 10 * 60 * 1000;
const MANUAL_FLUSH_MIN_GAP_MS = 15 * 60 * 1000;
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
let dailyReportTimer: NodeJS.Timeout | null = null;
let nextReportAt: number | null = null;
let dayStartedAt: number | null = null;
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
let sessionLive = false;
let clientWired = false;
let sessionGeneration = 0;
let isLoggingOut = false;
let libraryLoaded = false;
let favoriteIds: number[] = [];
let playingBlockedSince = 0;
let resumeInfo: ResumeInfo | null = null;
let rateLimitedAt = 0;
let lastRelogAt = 0;
let libraryVersion = 0;
let libraryRefreshing = false;
let libraryUpdatedAt: number | null = null;
let webBridge: WebBridge | null = null;
const processStartedAt = Date.now();

function notifyChange(): void {
  webBridge?.changed();
}

function bankElapsed(games: IdlingGame[], now = new Date()): void {
  for (const game of games) {
    game.accumulatedMs += now.getTime() - game.startTime.getTime();
    game.startTime = now;
  }
}

function isFrozen(): boolean {
  return isWaitingForResume || playingBlocked;
}

function schedulePauseNotification(reason: string): void {
  if (pauseNotified || pauseNotifyTimer) return;
  pauseEpisodeStart = Date.now();
  pauseNotifyTimer = setTimeout(() => {
    pauseNotifyTimer = null;
    pauseNotified = true;
    telegram.send(`⏸️ Idling paused — ${reason}. Auto-retrying.`, 'pauseResume');
  }, PAUSE_NOTIFY_GRACE_MS);
}

function scheduleResumeNotification(): void {
  if (!pauseNotified) return;
  if (resumeNotifyTimer) clearTimeout(resumeNotifyTimer);
  resumeNotifyTimer = setTimeout(() => {
    resumeNotifyTimer = null;
    pauseNotified = false;
    const downtime = formatDuration(Date.now() - pauseEpisodeStart);
    telegram.send(`▶️ Idling resumed after ${downtime} — ${idlingGames.length} games`, 'pauseResume');
  }, RESUME_NOTIFY_GRACE_MS);
}

function renderStatus(): void {
  if (IS_WEB) return;
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
    notifyChange();
  }, 60000);
}

function stopDisplayLoop(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

function randomHoursMs(minHours: number, maxHours: number): number {
  return Math.floor((minHours + Math.random() * (maxHours - minHours)) * HOURS_MS);
}

function randomIdlePhaseMs(): number {
  const { idleMinHours, idleMaxHours } = getSettings().schedule;
  return randomHoursMs(idleMinHours, idleMaxHours);
}

function randomCooldownMs(): number {
  const { cooldownMinHours, cooldownMaxHours } = getSettings().schedule;
  return randomHoursMs(cooldownMinHours, cooldownMaxHours);
}

function backoffMs(attempt: number, capMs: number): number {
  const exp = Math.min(capMs, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
  return Math.floor(exp / 2 + Math.random() * (exp / 2));
}

function tickRandomizer(): boolean {
  if (isFrozen()) return false;
  const now = new Date();
  let mutated = false;
  const scheduleEnabled = getSettings().schedule.enabled;

  const stillIdling: IdlingGame[] = [];
  for (const game of idlingGames) {
    if (game.nextPauseAtMs === null || !scheduleEnabled) {
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

function silencePauseNotifications(): void {
  if (pauseNotifyTimer) clearTimeout(pauseNotifyTimer);
  if (resumeNotifyTimer) clearTimeout(resumeNotifyTimer);
  pauseNotifyTimer = null;
  resumeNotifyTimer = null;
  pauseNotified = false;
}

function announceIdlingStarted(): void {
  const exemptName = idlingGames.find((g) => g.nextPauseAtMs === null)?.name ?? null;
  const startedSuffix = exemptName ? ` (exempt: ${exemptName})` : '';
  telegram.send(`▶️ Idling started — ${idlingGames.length} games${startedSuffix}`, 'lifecycle');
  if (IS_WEB) log.info('idle', `Idling started with ${countLabel(idlingGames.length, 'game')}${startedSuffix}`);
}

function warnFavoritesOverLimit(count: number): void {
  if (count <= MAX_IDLE_GAMES) return;
  log.warn('idle', `${count} favorites exceed the ${MAX_IDLE_GAMES}-game limit — idling the first ${MAX_IDLE_GAMES}.`, {
    hint: `Keep at most ${MAX_IDLE_GAMES} favorites to choose which ones idle.`,
  });
}

function scheduleResume(ms: number, kind: ResumeKind): void {
  if (resumeTimer) clearTimeout(resumeTimer);
  const now = Date.now();
  resumeInfo = {
    kind,
    since: resumeInfo?.since ?? now,
    nextRetryAt: now + ms,
    attempt: transientFailureCount + rateLimitCount + 1,
  };
  resumeTimer = setTimeout(attemptResume, ms);
  notifyChange();
}

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
  if (!selfInitiatedRelog && startTime) schedulePauseNotification(reason);
  if (selfInitiatedRelog) {
    log.info('idle', 'Scheduled relog to commit playtime');
  } else if (isTakeover) {
    log.warn('idle', 'Steam session taken over by another device', {
      hint: 'Nothing to do. steamidled tries again in a few minutes.',
    });
  } else {
    log.warn('idle', `Idling paused: ${reason}`, { hint: 'Nothing to do. steamidled reconnects on its own.' });
  }
  scheduleResume(
    isTakeover ? TAKEOVER_RETRY_MS : RESUME_RETRY_MS,
    isTakeover ? 'taken-over' : 'reconnecting'
  );
}

async function attemptResume(): Promise<void> {
  resumeTimer = null;
  if (isShuttingDown) return;
  resumeInfo = resumeInfo && { ...resumeInfo, nextRetryAt: null };
  notifyChange();

  if (client.isConnected) {
    transientFailureCount = 0;
    rateLimitCount = 0;
    restoreIdling();
    return;
  }

  if (client.isReconnecting) {
    scheduleResume(RESUME_RETRY_MS, resumeInfo?.kind ?? 'reconnecting');
    return;
  }
  if (client.isConnecting) {
    client.abortPendingConnect();
    scheduleResume(ABORT_SETTLE_MS, resumeInfo?.kind ?? 'reconnecting');
    return;
  }

  const credentials = loadCredentials();
  if (!credentials) {
    if (IS_WEB) {
      log.warn('steam', 'No stored login, cannot resume', { hint: 'Sign in again in the web GUI.' });
      if (startTime && !stopNotified) {
        telegram.send('🛑 Idling stopped — no stored credentials, cannot auto-resume.', 'critical');
        stopNotified = true;
      }
      silencePauseNotifications();
      resumeInfo = null;
      sessionLive = false;
      webBridge?.sessionInvalid(false);
      return;
    }
    log.error('steam', 'No stored credentials — cannot auto-resume', {
      hint: 'Log in again, then restart steamidled.',
      interactive: () => showError('No stored credentials — cannot auto-resume'),
    });
    telegram.send('🛑 Idling stopped — no stored credentials, cannot auto-resume.', 'critical');
    stopNotified = true;
    handleShutdown(0);
    return;
  }
  const generation = sessionGeneration;
  try {
    const refreshToken = client.currentRefreshToken ?? credentials.refreshToken;
    await client.loginWithRefreshToken(refreshToken, credentials.accountName);
    if (generation !== sessionGeneration) return;
    transientFailureCount = 0;
    rateLimitCount = 0;
    restoreIdling();
  } catch (err) {
    if (generation !== sessionGeneration) return;
    const e = err as Error & { eresult?: number };
    const code = e.eresult;
    const label =
      code !== undefined ? SteamUser.EResult[code] ?? `eresult ${code}` : e.message || 'unknown';

    if (selfInitiatedRelog) {
      selfInitiatedRelog = false;
      schedulePauseNotification(`flush relog failed to reconnect (${label})`);
    }

    if (code !== undefined && TERMINAL_ERESULTS.has(code)) {
      const message = `Resume aborted — ${label} is not auto-recoverable. Manual re-login required.`;
      const invalidToken = INVALID_TOKEN_ERESULTS.has(code);
      log.error('steam', message, {
        hint: invalidToken ? 'Sign in to Steam again.' : 'Check the Steam account, then try again.',
        interactive: () => showError(message),
      });
      if (!IS_WEB || (startTime && !stopNotified)) {
        telegram.send(`🛑 Idling stopped — ${label}. Manual re-login required.`, 'critical');
        stopNotified = true;
      }
      if (invalidToken) clearCredentials();
      if (IS_WEB) {
        silencePauseNotifications();
        resumeInfo = resumeInfo && { ...resumeInfo, nextRetryAt: null };
        if (invalidToken) {
          sessionLive = false;
          webBridge?.sessionInvalid(true);
        } else {
          webBridge?.sessionFatal({
            message: `Steam refused the session (${label})`,
            hint: 'This does not fix itself. Check the account in the Steam app, then try again.',
          });
        }
        return;
      }
      handleShutdown(0);
      return;
    }

    if (code !== undefined && RATE_LIMIT_ERESULTS.has(code)) {
      rateLimitCount += 1;
      rateLimitedAt = Date.now();
      if (!IS_WEB && rateLimitCount >= RATE_LIMIT_RETRY_LIMIT) {
        const message = `Resume failed after ${RATE_LIMIT_RETRY_LIMIT} rate-limited attempts: ${label}`;
        log.error('steam', message, {
          hint: 'Wait at least 30 minutes before starting steamidled again.',
          interactive: () => showError(message),
        });
        telegram.send(`🛑 Idling stopped — rate-limited ${RATE_LIMIT_RETRY_LIMIT}× (${label}).`, 'critical');
        stopNotified = true;
        handleShutdown(1);
        return;
      }
      const waitMs = Math.max(RATE_LIMIT_MIN_WAIT_MS, backoffMs(rateLimitCount, RATE_LIMIT_BACKOFF_CAP_MS));
      log.warn('steam', `Steam is rate limiting sign-ins (${label})`, {
        hint: `Nothing to do. steamidled tries again in ${formatWait(waitMs)}.`,
      });
      scheduleResume(waitMs, 'rate-limited');
      return;
    }

    transientFailureCount += 1;
    if (!IS_WEB && transientFailureCount >= GENERAL_FAILURE_RETRY_LIMIT) {
      const message = `Resume failed after ${GENERAL_FAILURE_RETRY_LIMIT} attempts: ${label}`;
      log.error('steam', message, {
        hint: "Check the server's internet connection and Steam's status, then restart steamidled.",
        interactive: () => showError(message),
      });
      telegram.send(
        `🛑 Idling stopped — failed to reconnect after ${GENERAL_FAILURE_RETRY_LIMIT}× (last error: ${label}).`,
        'critical'
      );
      stopNotified = true;
      handleShutdown(1);
      return;
    }
    const retryMs = backoffMs(transientFailureCount, BACKOFF_CAP_MS);
    log.warn('steam', `Reconnect failed (${label})`, {
      hint: `Nothing to do. steamidled tries again in ${formatWait(retryMs)}.`,
    });
    scheduleResume(retryMs, 'reconnecting');
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
  resumeInfo = null;
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
    telegram.send('🔄 flush — playtime committed, session refreshed', 'flush');
    log.info('idle', 'Relog done, playtime committed');
  } else {
    log.info('idle', `Reconnected to Steam, idling ${idlingGames.length} games`);
  }
  scheduleResumeNotification();

  if (takeoverDriftPending) {
    if (lastGoodPlaytime) reportTakeoverDrift(lastGoodPlaytime);
    takeoverDriftPending = false;
  }
  notifyChange();
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
        `📊 Post-takeover commit check (${name}): last-known ${lastGood.playtime}m → now ${now}m (Δ${sign}${delta}m).`,
        'zombie'
      );
    } catch {
    }
  }, TAKEOVER_DRIFT_DELAY_MS);
}

function msUntilNextReport(): number {
  const next = new Date();
  next.setHours(getSettings().dailyReportHour, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next.getTime() - Date.now();
}

function buildDailyReport(windowStart: Date): string {
  return formatDailyReport(
    idlingGames,
    pausedGames,
    pausingGames,
    dayStartAccumulatedMs,
    reportPeriodLabel(windowStart, getSettings().dailyReportHour),
    isFrozen()
  );
}

function reportWindowStart(boundary: number): Date {
  return dayStartedAt === null ? dayBefore(boundary) : new Date(dayStartedAt);
}

function webDailyReport(): string {
  return buildDailyReport(reportWindowStart(nextReportAt ?? Date.now() + msUntilNextReport()));
}

function scheduleDailyReport(): void {
  const firesAt = Date.now() + msUntilNextReport();
  nextReportAt = firesAt;
  dailyReportTimer = setTimeout(() => {
    if (startTime) telegram.send(buildDailyReport(reportWindowStart(firesAt)), 'dailyReport');
    snapshotDayStart();
    scheduleDailyReport();
  }, firesAt - Date.now());
}

function rearmDailyReport(): void {
  if (!dailyReportTimer) return;
  dailyReportTimer = clearTimer(dailyReportTimer);
  snapshotDayStart();
  scheduleDailyReport();
  const next = formatReportTime(new Date(nextReportAt ?? Date.now()));
  log.info('telegram', `Today's stats restart now for the new report hour, next daily report at ${next}`);
}

function snapshotDayStart(): void {
  dayStartAccumulatedMs.clear();
  const now = Date.now();
  dayStartedAt = now;
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
    lastRelogAt = Date.now();
  } catch {
    selfInitiatedRelog = false;
  }
}

function flushIntervalMs(): number {
  return getSettings().flushIntervalHours * HOURS_MS;
}

function canFlush(): boolean {
  const idle = !isWaitingForResume && !isInEditMode && !isShuttingDown && !playingBlocked;
  return idle && idlingGames.length > 0;
}

function scheduleFlush(): void {
  flushTimer = setTimeout(() => {
    if (canFlush()) {
      forceFlushRelog();
    }
    scheduleFlush();
  }, flushIntervalMs());
}

function rearmFlush(): void {
  if (!flushTimer) return;
  flushTimer = clearTimer(flushTimer);
  scheduleFlush();
}

function pickProbeApp(): IdlingGame | null {
  if (zombieBaseline) {
    const still = idlingGames.find((g) => g.appid === zombieBaseline!.appid);
    if (still) return still;
  }
  return idlingGames.find((g) => !unprobeableAppIds.has(g.appid)) ?? null;
}

function zombieCheckBlocked(): boolean {
  if (!getSettings().watchdog) return true;
  return isFrozen() || isInEditMode || isShuttingDown || selfInitiatedRelog || !client.isConnected;
}

async function runZombieCheck(): Promise<void> {
  if (zombieCheckBlocked()) {
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
  if (zombieCheckBlocked()) {
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

  telegram.send('⚠️ Zombie session — playtime not committing after a relog. Forcing reconnect.', 'zombie');
  log.warn('idle', 'Zombie session: playtime not committing after a relog', {
    hint: 'Nothing to do. steamidled forces a reconnect.',
  });
  zombieStrike = 0;
  zombieBaseline = null;
  forceFlushRelog();
}

function scheduleZombieCheck(): void {
  const timer = setTimeout(async () => {
    await runZombieCheck();
    if (zombieTimer === timer) scheduleZombieCheck();
  }, ZOMBIE_CHECK_INTERVAL_MS);
  zombieTimer = timer;
}

function applyWatchdog(enabled: boolean): void {
  if (!enabled) {
    zombieTimer = clearTimer(zombieTimer);
    zombieBaseline = null;
    zombieStrike = 0;
    return;
  }
  if (startTime !== null && !zombieTimer) scheduleZombieCheck();
}

function showHelp(): void {
  console.log(`steamidled — Steam game idler CLI and daemon

Usage:
  steamidled                   Interactive mode (login, pick games, idle)
  steamidled --headless        Headless mode: auto-login and idle your favorites
  steamidled --web             Headless mode with a web GUI on port ${WEB_DEFAULT_PORT} (STEAMIDLED_WEB_PORT)
  steamidled --setup-telegram  (Re)configure Telegram notifications
  steamidled --logout          Forget the saved Steam login
  steamidled --version, -v     Print version
  steamidled --help, -h        Show this help

Config lives in ~/.steam-idler/ (credentials, favorites, telegram, settings).`);
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

  client.setPersonaState(getSettings().personaState);

  process.on('SIGINT', () => handleShutdown(0));
  process.on('SIGTERM', () => handleShutdown(0));
  process.on('SIGHUP', () => handleShutdown(0));
  process.on('uncaughtException', handleCrash);
  process.on('unhandledRejection', handleCrash);

  client.onRefreshToken((refreshToken) => {
    const stored = loadCredentials();
    const name = client.accountName ?? (accountName || stored?.accountName);
    if (!name) return;
    const base = stored?.accountName === name ? stored : undefined;
    if (!saveCredentials({ ...base, accountName: name, refreshToken })) {
      telegram.send(
        '⚠️ Steam renewed the login token but it could not be saved — the next restart will need an interactive login.',
        'critical'
      );
    }
  });

  if (IS_WEB) {
    await runWeb();
  } else if (isHeadless) {
    await runHeadless();
  } else {
    await runInteractive();
  }

  await new Promise<void>(() => {});
}

const HEADLESS_EXIT_TRANSIENT = 1;
const HEADLESS_EXIT_CONFIG = 2;

async function failHeadless(message: string, exitCode: number): Promise<never> {
  log.error('steam', message, { interactive: () => showError(message) });
  const sent = telegram.send(`🛑 Headless start failed — ${message}`, 'critical');
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
    log.warn('steam', `Rate limited by Steam — retrying login in ${formatDuration(waitMs)}.`, {
      hint: 'Nothing to do. Do not restart steamidled meanwhile, every early login extends the lockout.',
    });
    if (rateLimitedAttempts === 1) {
      telegram.send('⏸️ Headless start rate-limited by Steam — waiting before retrying.', 'lifecycle');
    }
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
  warnFavoritesOverLimit(matchingGames.length);

  const exemptName =
    exemptAppId && selectedGames.some((g) => g.appid === exemptAppId)
      ? gamesById.get(exemptAppId)?.name ?? null
      : null;
  log.info('idle', `Starting ${selectedGames.length} favorite game(s)...`);
  if (exemptName) log.info('idle', `Exempt from randomizer: ${exemptName}`);
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
    if (!isWaitingForResume) {
      client.setGamesPlaying(idlingGames.map((g) => g.appid));
    }
  } else {
    applySelection(newSelection, newExemptAppId);
  }

  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  isInEditMode = false;

  if (!startTime) return;
  renderStatus();
  if (!isWaitingForResume) startDisplayLoop();
}

function applySelection(selection: GameSelection[], nextExemptAppId: number | null): void {
  const newSelection = selection.slice(0, MAX_IDLE_GAMES);
  const oldAppIds = new Set(
    [...idlingGames, ...pausedGames, ...pausingGames].map((g) => g.appid)
  );
  const newAppIds = new Set(newSelection.map((g) => g.appid));

  const applyExemptChange = (game: IdlingGame): void => {
    const shouldBeExempt = game.appid === nextExemptAppId;
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
      if (game.nextPauseAtMs === null) {
        game.startTime = new Date();
        keptIdlingGames.push(game);
      } else {
        keptPausingGames.push(game);
      }
    }
  }

  for (const entry of newSelection) {
    if (!oldAppIds.has(entry.appid)) {
      dayStartAccumulatedMs.delete(entry.appid);
      const steamGame = gamesById.get(entry.appid);
      const isExempt = entry.appid === nextExemptAppId;
      keptIdlingGames.push(createIdlingGame(entry, steamGame, isExempt));
    }
  }

  idlingGames = keptIdlingGames;
  pausedGames = keptPausedGames;
  pausingGames = keptPausingGames;
  exemptAppId = nextExemptAppId;

  if (!isWaitingForResume) {
    client.setGamesPlaying(idlingGames.map((g) => g.appid));
  }
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
    playingBlockedSince = now.getTime();
    log.info('idle', 'Paused while a game runs on this account on another device');
  } else {
    log.info('idle', 'The other device stopped playing, idling continues');
  }

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
  notifyChange();
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
  if (playingBlocked) playingBlockedSince = Date.now();

  const appIds = games.map((g) => g.appid);
  client.setGamesPlaying(appIds);

  setupKeyboardInput();

  renderStatus();
  startDisplayLoop();

  ensureClientWiring();
  sessionLive = true;

  snapshotDayStart();
  scheduleDailyReport();
  scheduleFlush();
  if (getSettings().watchdog) scheduleZombieCheck();

  announceIdlingStarted();

  if (!client.isConnected) {
    enterWaitingState('disconnected before idling started');
  }
}

function ensureClientWiring(): void {
  if (clientWired) return;
  clientWired = true;

  client.onPlayingState((blocked, playingApp) => {
    if (!sessionLive) return;
    handlePlayingState(blocked, playingApp);
  });

  client.onDisconnected((eresult, msg) => {
    if (isLoggingOut) {
      isLoggingOut = false;
      return;
    }
    if (!sessionLive || isShuttingDown) return;
    const isTakeover = TAKEOVER_ERESULTS.has(eresult);
    if (isTakeover) selfInitiatedRelog = false;
    if (isTakeover && lastGoodPlaytime) takeoverDriftPending = true;
    const reason = selfInitiatedRelog
      ? 'flushing playtime (scheduled relog)'
      : isTakeover
      ? 'player active on this account elsewhere'
      : `disconnected (${msg}, eresult ${eresult})`;
    if (!isInEditMode && !selfInitiatedRelog) {
      log.warn('steam', `Disconnected from Steam: ${msg} (${eresult})`, {
        interactive: () => console.log(`\nDisconnected from Steam: ${msg} (${eresult})`),
      });
    }
    enterWaitingState(reason, isTakeover);
  });

  client.onError((err) => {
    if (!sessionLive || isShuttingDown) return;
    const isTakeover = isTakeoverError(err);
    if (isTakeover) selfInitiatedRelog = false;
    if (isTakeover && lastGoodPlaytime) takeoverDriftPending = true;
    const reason = isTakeover
      ? 'player active on this account elsewhere'
      : `Steam error: ${err.message}`;
    if (!isInEditMode) {
      log.warn('steam', `Steam error: ${err.message}`, {
        interactive: () => console.log(`\nSteam error: ${err.message}`),
      });
    }
    enterWaitingState(reason, isTakeover);
  });

  client.onLoggedOn(() => {
    if (!sessionLive) return;
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
}

function clearTimer(timer: NodeJS.Timeout | null): null {
  if (timer) clearTimeout(timer);
  return null;
}

function resetSession(): void {
  sessionGeneration += 1;
  resumeTimer = clearTimer(resumeTimer);
  pauseNotifyTimer = clearTimer(pauseNotifyTimer);
  resumeNotifyTimer = clearTimer(resumeNotifyTimer);
  flushTimer = clearTimer(flushTimer);
  zombieTimer = clearTimer(zombieTimer);
  dailyReportTimer = clearTimer(dailyReportTimer);
  nextReportAt = null;
  dayStartedAt = null;
  stopDisplayLoop();
  isWaitingForResume = false;
  waitingReason = '';
  selfInitiatedRelog = false;
  playingBlocked = false;
  playingBlockedSince = 0;
  takeoverDriftPending = false;
  zombieBaseline = null;
  lastGoodPlaytime = null;
  zombieStrike = 0;
  unprobeableAppIds.clear();
  transientFailureCount = 0;
  rateLimitCount = 0;
  pauseNotified = false;
  pauseEpisodeStart = 0;
  resumeInfo = null;
  rateLimitedAt = 0;
  libraryRefreshing = false;
  idlingGames = [];
  pausedGames = [];
  pausingGames = [];
  startTime = null;
  isIdling = false;
  sessionLive = false;
  stopNotified = false;
  accountName = '';
  allGames = [];
  gamesById = new Map();
  exemptAppId = null;
  libraryLoaded = false;
  favoriteIds = [];
  dayStartAccumulatedMs.clear();
  notifyChange();
}

function ensureSessionTimers(nonEmpty: boolean): void {
  if (nonEmpty && !startTime) {
    startTime = new Date();
    isIdling = true;
    stopNotified = false;
    if (!flushTimer) scheduleFlush();
    if (!zombieTimer && getSettings().watchdog) scheduleZombieCheck();
    snapshotDayStart();
    if (!dailyReportTimer) scheduleDailyReport();
    if (!isWaitingForResume) startDisplayLoop();
    announceIdlingStarted();
    return;
  }
  if (!nonEmpty && startTime) {
    flushTimer = clearTimer(flushTimer);
    zombieTimer = clearTimer(zombieTimer);
    startTime = null;
    isIdling = false;
  }
}

function sessionAppIds(): number[] {
  return [...idlingGames, ...pausedGames, ...pausingGames].map((g) => g.appid);
}

function selectionFromAppIds(appIds: number[]): GameSelection[] {
  return appIds.flatMap((appid) => {
    const game = gamesById.get(appid);
    return game ? [{ appid, name: game.name }] : [];
  });
}

function stopSession(reason: string, logMessage: string): void {
  const hadGames = sessionAppIds().length > 0;
  if (!isFrozen()) bankElapsed(idlingGames);
  client.stopPlaying();
  idlingGames = [];
  pausedGames = [];
  pausingGames = [];
  silencePauseNotifications();
  ensureSessionTimers(false);
  if (hadGames) {
    telegram.send(`🛑 Idling stopped — ${reason}`, 'lifecycle');
    log.info('idle', logMessage);
  }
  notifyChange();
}

function webStop(): void {
  stopSession('stopped in the web GUI', 'Idling stopped in the web GUI');
}

function webApplySelection(appIds: number[]): void {
  if (appIds.length === 0) {
    webStop();
    return;
  }
  const wasIdling = startTime !== null;
  if (!isFrozen()) bankElapsed(idlingGames);
  applySelection(selectionFromAppIds(appIds), exemptAppId);
  ensureSessionTimers(true);
  if (wasIdling) log.info('idle', `Selection changed, now idling ${countLabel(sessionAppIds().length, 'game')}`);
  notifyChange();
}

function webStartFavorites(): number {
  const missing = favoriteIds.filter((appid) => !gamesById.has(appid));
  if (missing.length > 0) {
    log.warn('idle', `Skipped ${missing.length} favorite(s) missing from the library: ${missing.join(', ')}`, {
      hint: 'Remove them from favorites, or restart steamidled if the library was incomplete.',
    });
  }
  const available = favoriteIds.filter((appid) => gamesById.has(appid));
  warnFavoritesOverLimit(available.length);
  const selected = available.slice(0, MAX_IDLE_GAMES);
  if (selected.length > 0) webApplySelection(selected);
  return selected.length;
}

function webSetExempt(appId: number | null): boolean {
  if (!saveExempt(accountName, appId)) return false;
  const appIds = sessionAppIds();
  if (appIds.length > 0) {
    if (!isFrozen()) bankElapsed(idlingGames);
    applySelection(selectionFromAppIds(appIds), appId);
  } else {
    exemptAppId = appId;
  }
  const name = appId === null ? null : gamesById.get(appId)?.name ?? `App ${appId}`;
  log.info('idle', name ? `Exempt from cooldown: ${name}` : 'No game is exempt from cooldown');
  notifyChange();
  return true;
}

function webSetFavorite(appId: number, favorite: boolean): boolean {
  const without = favoriteIds.filter((id) => id !== appId);
  const next = favorite ? [...without, appId] : without;
  if (favorite && favoriteIds.includes(appId)) return true;
  if (!saveFavorites(accountName, next)) return false;
  favoriteIds = next;
  notifyChange();
  return true;
}

function webLogout(): void {
  if (startTime && !stopNotified) {
    telegram.send('🛑 Idling stopped — logged out in the web GUI', 'lifecycle');
  }
  silencePauseNotifications();
  if (client.isConnected) {
    client.stopPlaying();
    isLoggingOut = true;
  } else {
    client.abortPendingConnect();
  }
  client.logout();
  clearCredentials();
  resetSession();
  log.info('steam', 'Logged out, the saved login was removed');
}

function webBeginSession(name: string): SessionStart {
  ensureClientWiring();
  if (name === accountName && libraryLoaded) {
    const announce = stopNotified && startTime !== null;
    sessionLive = true;
    stopNotified = false;
    if (isWaitingForResume) {
      resumeTimer = clearTimer(resumeTimer);
      restoreIdling();
    } else {
      client.setGamesPlaying(idlingGames.map((g) => g.appid));
    }
    if (announce) announceIdlingStarted();
    const playing = client.steamUser.playingState;
    if (client.isPlayingBlocked && !playingBlocked) handlePlayingState(true, playing?.appid ?? 0);
    notifyChange();
    return 'resumed';
  }
  resetSession();
  accountName = name;
  playingBlocked = client.isPlayingBlocked;
  if (playingBlocked) playingBlockedSince = Date.now();
  sessionLive = true;
  notifyChange();
  return 'fresh';
}

async function fetchLibrary(): Promise<SteamGame[] | null> {
  const generation = sessionGeneration;
  const games = await client.getOwnedGames();
  return generation === sessionGeneration ? games : null;
}

function applyLibrary(games: SteamGame[]): void {
  allGames = games;
  gamesById = new Map(games.map((g) => [g.appid, g]));
  favoriteIds = loadFavorites(accountName);
  exemptAppId = loadExempt(accountName);
  libraryLoaded = true;
  libraryVersion += 1;
  libraryUpdatedAt = Date.now();
  log.info('steam', `Library loaded: ${countLabel(games.length, 'game')}`);
  notifyChange();
}

async function webLoadLibrary(): Promise<number | null> {
  const games = await fetchLibrary();
  if (!games) return null;
  applyLibrary(games);
  return games.length;
}

function webRetryResume(): void {
  if (resumeTimer || !isWaitingForResume) return;
  const announce = stopNotified && startTime !== null;
  sessionLive = true;
  stopNotified = false;
  if (announce) announceIdlingStarted();
  scheduleResume(0, resumeInfo?.kind ?? 'reconnecting');
}

const schedule = createSchedule({
  idling: () => idlingGames,
  setIdling: (games) => {
    idlingGames = games;
  },
  pausing: () => pausingGames,
  setPausing: (games) => {
    pausingGames = games;
  },
  paused: () => pausedGames,
  isFrozen,
  bank: () => {
    if (!isFrozen()) bankElapsed(idlingGames);
  },
  hoursMs: HOURS_MS,
  randomIdlePhaseMs,
  randomCooldownMs,
  setGamesPlaying: (appIds) => client.setGamesPlaying(appIds),
  stateChanged: notifyChange,
  log: (message) => log.info('idle', message),
});

function sessionGames(): IdlingGame[] {
  return [...idlingGames, ...pausedGames, ...pausingGames];
}

const controls = createSessionControls({
  resume: {
    isWaiting: () => isWaitingForResume,
    hasPendingTimer: () => resumeTimer !== null,
    isFlushRelog: () => selfInitiatedRelog,
    isTakenOver: () => resumeInfo?.kind === 'taken-over',
    rateLimitedAt: () => rateLimitedAt,
    runNow: () => {
      resumeTimer = clearTimer(resumeTimer);
      resumeInfo = resumeInfo && { ...resumeInfo, nextRetryAt: null };
      notifyChange();
      void attemptResume();
    },
  },
  flush: {
    canFlushNow: () => canFlush() && !selfInitiatedRelog && client.isConnected,
    lastRelogAt: () => lastRelogAt,
    relog: () => {
      forceFlushRelog();
      return selfInitiatedRelog;
    },
    rearm: rearmFlush,
  },
  library: {
    generation: () => sessionGeneration,
    fetch: fetchLibrary,
    licensesReady: () => client.licensesReady,
    apply: applyLibrary,
    refreshing: () => libraryRefreshing,
    setRefreshing: (refreshing) => {
      libraryRefreshing = refreshing;
    },
  },
  session: {
    appIds: sessionAppIds,
    namesOf: (appIds) => sessionGames().filter((game) => appIds.includes(game.appid)).map((game) => game.name),
    inLibrary: (appId) => gamesById.has(appId),
    keepOnly: (appIds) => {
      if (!isFrozen()) bankElapsed(idlingGames);
      applySelection(selectionFromAppIds(appIds), exemptAppId);
      notifyChange();
    },
    stopEmptied: () =>
      stopSession('all selected games left your library', 'Idling stopped, every selected game left your library'),
  },
  settings: {
    update: updateSettings,
    rerollIdlePhases: () => schedule.rerollIdlePhases(),
    applyWatchdog,
    setPersona: (state) => client.setPersonaState(state),
    rearmDailyReport,
  },
  rateLimitWaitMs: RATE_LIMIT_MIN_WAIT_MS,
  manualFlushGapMs: MANUAL_FLUSH_MIN_GAP_MS,
  stateChanged: notifyChange,
});

function webStoredFavorites(): number[] {
  const credentials = loadCredentials();
  return credentials ? loadFavorites(credentials.accountName) : [];
}

function engineState(): EngineState {
  return {
    sessionLive,
    accountName,
    libraryLoaded,
    allGames,
    gamesById,
    favorites: favoriteIds,
    exemptAppId,
    idlingGames,
    pausedGames,
    pausingGames,
    startTime,
    isWaitingForResume,
    selfInitiatedRelog,
    playingBlocked,
    playingBlockedSince,
    resumeInfo,
    libraryVersion,
    libraryRefreshing,
    libraryUpdatedAt,
    dayStartedAt,
    dayStartAccumulatedMs,
    settings: getSettings(),
  };
}

const engine: Engine = {
  client,
  telegram,
  get version() {
    return packageVersion();
  },
  startedAt: processStartedAt,
  state: engineState,
  loginRetryDelay: (rateLimited, attempt) =>
    rateLimited
      ? Math.max(RATE_LIMIT_MIN_WAIT_MS, backoffMs(attempt, RATE_LIMIT_BACKOFF_CAP_MS))
      : backoffMs(attempt, BACKOFF_CAP_MS),
  storedFavorites: webStoredFavorites,
  beginSession: webBeginSession,
  loadLibrary: webLoadLibrary,
  startFavorites: webStartFavorites,
  applySelection: webApplySelection,
  stop: webStop,
  setExempt: webSetExempt,
  setFavorite: webSetFavorite,
  logout: webLogout,
  retryResume: webRetryResume,
  retryNow: controls.retryNow,
  flushNow: controls.flushNow,
  refreshLibrary: controls.refreshLibrary,
  updateSettings: controls.updateSettings,
  coolDownNow: (appId, hours) => schedule.coolDownNow(appId, hours),
  endCooldownNow: (appId) => schedule.endCooldownNow(appId),
  setNextCooldownIn: (appId, hours) => schedule.setNextCooldownIn(appId, hours),
  setCooldownRemaining: (appId, hours) => schedule.setCooldownRemaining(appId, hours),
  rerollSchedules: () => schedule.rerollSchedules(),
  endAllCooldowns: () => schedule.endAllCooldowns(),
  dailyReport: webDailyReport,
};

async function runWeb(): Promise<void> {
  ensureClientWiring();
  const { startWebController } = await import('./web/controller.js');
  webBridge = await startWebController(engine);
}

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
  if (dailyReportTimer) {
    clearTimeout(dailyReportTimer);
    dailyReportTimer = null;
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
    log.error('steam', 'Logout failed', {
      cause: err,
      interactive: () => console.error('Logout failed:', (err as Error).message),
    });
  }
  webBridge?.stop();

  const finalMessage =
    !stopNotified && startTime ? telegram.send('🛑 Idling stopped — quit by user', 'lifecycle') : Promise.resolve();

  showGoodbye();
  const grace = new Promise((resolve) => setTimeout(resolve, SHUTDOWN_FLUSH_GRACE_MS));
  void Promise.all([grace, finalMessage]).then(() => process.exit(exitCode));
}

function handleCrash(err: unknown): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log.error('steam', 'Fatal error', {
    cause: err instanceof Error ? err.stack ?? err.message : err,
    hint: 'Report this at https://github.com/louisraetz/steamidled/issues with the lines above.',
    interactive: () => console.error('\nFatal error:', err),
  });
  webBridge?.stop();

  if (resumeTimer) clearTimeout(resumeTimer);
  if (resumeNotifyTimer) clearTimeout(resumeNotifyTimer);
  if (pauseNotifyTimer) clearTimeout(pauseNotifyTimer);
  if (dailyReportTimer) clearTimeout(dailyReportTimer);
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
          : `🛑 steamidled crashed before idling started (${message}).`,
        'critical'
      );

  const grace = new Promise((resolve) => setTimeout(resolve, CRASH_FLUSH_GRACE_MS));
  void Promise.all([grace, finalMessage]).then(() => process.exit(1));
}

main().catch((err: Error) => {
  if (err.name === 'ExitPromptError') {
    showGoodbye();
    process.exit(0);
  }
  log.error('steam', err.message, { interactive: () => showError(err.message) });
  process.exit(1);
});
