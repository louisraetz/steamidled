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
// A reconnect must hold for this long before we announce "▶️ resumed". While the
// player is active on the account, every reconnect is kicked again within
// seconds, so debouncing the notification collapses that flap into a single
// paused/resumed pair instead of one per 60s retry.
const RESUME_NOTIFY_GRACE_MS = 90_000;
// Symmetric grace for the "⏸️ paused" side: a blip that reconnects within this
// window (steam-user's own auto-relogin takes seconds) produces no messages.
const PAUSE_NOTIFY_GRACE_MS = 30_000;
// After a takeover the player is typically active for hours; a logon attempt
// every 60s only gets kicked again and risks a logon rate limit.
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
// Steam's logon throttle lasts ~30 min and every early retry extends it, so a
// rate-limited wait never starts below this.
const RATE_LIMIT_MIN_WAIT_MS = 10 * 60 * 1000;
// Periodic relog to force a playtime commit (clean logOff). Caps worst-case loss
// at this interval instead of the whole session.
const FLUSH_INTERVAL_MS = 4 * HOURS_MS;
// Watchdog that checks server playtime is actually climbing. Must exceed the
// ~30min commit lore to avoid false positives.
const ZOMBIE_CHECK_INTERVAL_MS = 90 * 60 * 1000;
// Grace before exit so a clean logOff socket write (and Telegram fetch) can land.
const CRASH_FLUSH_GRACE_MS = 2000;
// Delay between tearing down a stuck steam-user connect attempt and our own logOn
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
// Pending debounced "▶️ resumed" notification (see RESUME_NOTIFY_GRACE_MS).
let resumeNotifyTimer: NodeJS.Timeout | null = null;
// Pending debounced "⏸️ paused" notification (see PAUSE_NOTIFY_GRACE_MS).
let pauseNotifyTimer: NodeJS.Timeout | null = null;
// True from the moment a pause was announced until the matching resume goes out.
let pauseNotified = false;
let pauseEpisodeStart = 0;
let midnightTimer: NodeJS.Timeout | null = null;
let flushTimer: NodeJS.Timeout | null = null;
let zombieTimer: NodeJS.Timeout | null = null;
let isInEditMode = false;
let isWaitingForResume = false;
let waitingReason = '';
let isShuttingDown = false;
// True once a terminal 🛑 "stopped" message has been sent (give-up paths). A
// 🛑 "paused" message does not count: a later quit still deserves its own.
let stopNotified = false;
// True while another session on this account is playing. Steam blocks this
// session's gamesPlayed entirely, so local time accounting freezes for every
// idling game, not just the one being played.
let playingBlocked = false;
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
// Apps the owned-apps probe returns nothing for (family-shared / unvetted);
// skipped as probe candidates so the watchdog is not silently disabled.
const unprobeableAppIds = new Set<number>();

// Folds the live delta into accumulatedMs and restarts the clock. Idempotent,
// so overlapping freeze paths (edit mode, waiting state, playing-blocked) can
// never double-count the same interval.
function bankElapsed(games: IdlingGame[], now = new Date()): void {
  for (const game of games) {
    game.accumulatedMs += now.getTime() - game.startTime.getTime();
    game.startTime = now;
  }
}

// True while idling games accrue no server-side playtime, so the display and
// daily report must not add the live delta.
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

// Closes an announced episode once the reconnect has held for the grace window
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

// Renders the status table from current state
function renderStatus(): void {
  showIdlingStatus(idlingGames, pausedGames, pausingGames, {
    waitingReason: isWaitingForResume ? waitingReason : null,
    playingBlocked,
    showKeyHints: !isHeadless,
  });
}

// (Re)starts the 60s tick: advances the randomizer and refreshes the table. On a
// non-TTY (systemd/journald) the table is only re-printed when something
// changed, instead of ~35 lines every minute.
function startDisplayLoop(): void {
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(() => {
    if (!startTime || isInEditMode) return;
    const changed = tickRandomizer();
    if (changed || process.stdout.isTTY) renderStatus();
  }, 60000);
}

// Stops the 60s tick
function stopDisplayLoop(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

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

// Moves games between idling/pausing arrays based on per-game random schedules.
// Returns true when the sets changed. Skipped while frozen: no playtime accrues,
// so no idle phase can complete.
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

// Recognises both shapes steam-user may surface a session-takeover as: a numeric
// eresult attached to the error, or the message string itself.
function isTakeoverError(err: Error & { eresult?: number }): boolean {
  if (err.eresult !== undefined && TAKEOVER_ERESULTS.has(err.eresult)) return true;
  return /loggedinelsewhere|logonsessionreplaced/i.test(err.message ?? '');
}

// Freezes elapsed time and arms the resume poller after any disconnect or Steam error
function enterWaitingState(reason: string, isTakeover = false): void {
  // Our own logOff during shutdown/crash emits 'disconnected' asynchronously;
  // that must not re-arm resume or announce a pause after "stopped".
  if (isWaitingForResume || isShuttingDown) return;
  isWaitingForResume = true;
  waitingReason = reason;
  // If a resume notification is still inside its grace window, the session is
  // flapping: we reconnected and Steam kicked us again because the player is
  // still active. This pause episode was already announced, so cancel the
  // pending resume and stay silent instead of emitting another paused/resumed
  // pair on every retry.
  if (resumeNotifyTimer) {
    clearTimeout(resumeNotifyTimer);
    resumeNotifyTimer = null;
  }
  // While blocked the clocks are already frozen (startTime stale by design);
  // banking again would credit the blocked interval.
  if (!playingBlocked) bankElapsed(idlingGames);
  stopDisplayLoop();
  // In edit mode the selector owns the screen; enterEditMode re-renders the
  // waiting state once the user leaves the selector.
  if (!isInEditMode) renderStatus();
  // A self-initiated relog (flush/zombie recovery) suppresses the pause message;
  // restoreIdling emits a single quiet "🔄 flush" line instead.
  if (!selfInitiatedRelog) schedulePauseNotification(reason);
  resumeTimer = setTimeout(attemptResume, isTakeover ? TAKEOVER_RETRY_MS : RESUME_RETRY_MS);
}

// Tries to log back in with the saved refresh token; bounded retries for both auth and generic errors
async function attemptResume(): Promise<void> {
  resumeTimer = null;
  if (isShuttingDown) return;

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

  // Same trap mid-flight: after a non-fatal disconnect steam-user keeps
  // reconnecting on its own (1s..60s backoff, each attempt several seconds), and
  // logOn while it is connecting throws "Already attempting to log on" the same
  // uncatchable way. Usually its loop ends in loggedOn (→ restoreIdling) or
  // error (→ our next tick logs on), so keep polling for a bounded time.
  if (client.isReconnecting) {
    resumeTimer = setTimeout(attemptResume, RESUME_RETRY_MS);
    return;
  }
  // Past that bound and still mid-connect: steam-user's loop is stuck (CM
  // connect timeouts hold _connecting without ever emitting). Reclaim the
  // connection, then log on next tick: an in-flight CM-list fetch of the
  // aborted attempt only notices the teardown once it resumes, and a logOn in
  // the same tick would let it open a second connection.
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
    // Prefer the token the session last ran on: a renewal that failed to
    // persist leaves a dead token on disk.
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

    // A flush relog that does not come back is a real outage, not a quiet
    // flush any more: stop suppressing and announce it like any other pause.
    if (selfInitiatedRelog) {
      selfInitiatedRelog = false;
      schedulePauseNotification(`flush relog failed to reconnect (${label})`);
    }

    // Terminal: auto-resume can never fix it (bad credentials, account-level
    // block, or protocol mismatch). Stop cleanly and require manual action.
    // Exit 0 so a systemd unit does not restart-loop a permanent failure.
    if (code !== undefined && TERMINAL_ERESULTS.has(code)) {
      showError(`Resume aborted — ${label} is not auto-recoverable. Manual re-login required.`);
      telegram.send(`🛑 Idling stopped — ${label}. Manual re-login required.`);
      stopNotified = true;
      if (INVALID_TOKEN_ERESULTS.has(code)) clearCredentials();
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
      resumeTimer = setTimeout(
        attemptResume,
        Math.max(RATE_LIMIT_MIN_WAIT_MS, backoffMs(rateLimitCount, RATE_LIMIT_BACKOFF_CAP_MS))
      );
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
  // steam-user's auto-reconnect can land after we already said goodbye (e.g. a
  // flush relog was in flight when the user quit). Leave the session off.
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

  // A blip that reconnected inside the pause grace was never announced, so
  // there is nothing to resume from either.
  if (pauseNotifyTimer) {
    clearTimeout(pauseNotifyTimer);
    pauseNotifyTimer = null;
  }
  if (selfInitiatedRelog) {
    selfInitiatedRelog = false;
    telegram.send('🔄 flush — playtime committed, session refreshed');
  }
  // Debounce: only announce a resume that actually holds. If the player is
  // still active, this reconnect is kicked again within seconds and
  // enterWaitingState cancels this timer (see RESUME_NOTIFY_GRACE_MS), so a
  // long play session collapses to a single paused/resumed pair. Also re-arms
  // after a flush relog that landed inside an announced episode.
  scheduleResumeNotification();

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
    // Fires just after midnight but reports on the day that ended
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

// Captures each game's current accumulated playtime for tomorrow's "today gain"
// calculation. Only idling games have a live delta; user-paused and cooldown
// games are frozen at accumulatedMs (their startTime is stale by design).
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

// Shared self-initiated relog used by the periodic flush and zombie recovery. A
// clean logOff commits the in-flight idle session; the disconnect→loggedOn
// handlers restore idling and clear the suppression flag. Re-entrant calls
// (flush timer and zombie check firing close together) are ignored: steamID
// stays set until Steam acknowledges the logOff, so isConnected alone is not
// enough to detect a relog already in flight.
function forceFlushRelog(): void {
  if (!client.isConnected || selfInitiatedRelog) return;
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
    const idle = !isWaitingForResume && !isInEditMode && !isShuttingDown && !playingBlocked;
    if (idle && idlingGames.length > 0) {
      forceFlushRelog();
    }
    scheduleFlush();
  }, FLUSH_INTERVAL_MS);
}

// Picks the app to probe: stick with the current baseline app while it is still
// continuously idling, otherwise fall back to the first probeable idling game
// (which forces a re-baseline rather than a false zombie verdict).
function pickProbeApp(): IdlingGame | null {
  if (zombieBaseline) {
    const still = idlingGames.find((g) => g.appid === zombieBaseline!.appid);
    if (still) return still;
  }
  return idlingGames.find((g) => !unprobeableAppIds.has(g.appid)) ?? null;
}

// Mitigation B: confirm the server's playtime is actually climbing for a
// continuously-idled app. If a full window passes with no increase, commits are
// silently dying (zombie session) → alert + force a relog. Self-reschedules.
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
    return; // transient fetch error — keep the baseline, try again next tick
  }
  // State may have moved while the probe was in flight (disconnect, edit mode,
  // shutdown); a relog must not fire into any of those.
  if (isFrozen() || isInEditMode || isShuttingDown || selfInitiatedRelog || !client.isConnected) {
    return;
  }
  if (playtime === null) {
    // Inconclusive (app absent from the owned-apps response, e.g. family-shared).
    // Remember it so the next tick probes a different game instead of this one
    // forever.
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

// Prints CLI usage
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

// Reads the package version at runtime (dist/index.js → ../package.json)
function packageVersion(): string {
  const require = createRequire(import.meta.url);
  return (require('../package.json') as { version: string }).version;
}

// Main entry point that orchestrates the application flow
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
  // Terminal closed / SSH dropped: still stop playing and log off cleanly
  process.on('SIGHUP', () => handleShutdown(0));
  process.on('uncaughtException', handleCrash);
  process.on('unhandledRejection', handleCrash);

  // Steam renews a refresh token that is close to expiry at logon; the old one
  // is invalid from then on, so persist the new one or the next start fails.
  // The live session keeps running on the in-memory token either way.
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

// Exit codes for headless start failures. 1 = transient (systemd may restart),
// 2 = configuration problem that a restart cannot fix (README suggests
// RestartPreventExitStatus=2).
const HEADLESS_EXIT_TRANSIENT = 1;
const HEADLESS_EXIT_CONFIG = 2;

// Aborts a headless start: logs off if a session exists, tells Telegram why
// (otherwise a systemd unit dies silently), then exits after the flush grace.
async function failHeadless(message: string, exitCode: number): Promise<never> {
  showError(message);
  const sent = telegram.send(`🛑 Headless start failed — ${message}`);
  try {
    if (client.isConnected) client.logout();
  } catch {
    // best effort
  }
  const grace = new Promise((resolve) => setTimeout(resolve, SHUTDOWN_FLUSH_GRACE_MS));
  await Promise.all([grace, sent]);
  process.exit(exitCode);
}

// Headless mode: auto-login and start idling favorites
async function runHeadless(): Promise<void> {
  if (!hasStoredLogin()) {
    await failHeadless('No stored login found. Run interactively first to log in.', HEADLESS_EXIT_CONFIG);
  }

  // A rate-limited logon must not exit: systemd would restart in 10s and try
  // again, and every attempt extends Steam's lockout. Wait it out in-process.
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
    // A dead token, banned account or protocol mismatch will not change on the
    // next restart; exit 2 so systemd stops instead of logging on every 10s.
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
    // Family-shared favorites are only visible once license data arrived; a
    // slow PICS at boot must not look like a permanent config error.
    if (!client.ownershipCacheComplete) {
      await failHeadless(
        'No matching games found — library incomplete (license data timed out). Retrying.',
        HEADLESS_EXIT_TRANSIENT
      );
    }
    await failHeadless('No matching games found for your favorites.', HEADLESS_EXIT_CONFIG);
  }

  // A hand-edited or legacy favorites file may hold more than Steam allows;
  // idle the first 32 instead of dying on the gamesPlayed cap.
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

// Interactive mode: full UI with prompts and game selector
async function runInteractive(): Promise<void> {
  showWelcome(packageVersion());

  // A failed or timed-out login returns to the method picker instead of killing
  // the process; Ctrl+C at the prompt is the way out.
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

// Sets up raw mode keyboard input handling for edit and quit commands. Headless
// never touches stdin: `steamidled --headless &` from a shell would otherwise
// be stopped by SIGTTOU when setRawMode runs in the background.
function setupKeyboardInput(): void {
  if (isHeadless) return;
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on('keypress', async (str, key) => {
      // Raw mode stays on during the exit grace; nothing may repaint over the goodbye
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

  stopDisplayLoop();
  // Steam keeps crediting while the selector is open (gamesPlayed stays set), so
  // the clock keeps running from here; only a block has it frozen already.
  if (!playingBlocked) bankElapsed(idlingGames);

  console.clear();

  const currentSelection = getGameCurrentSelection();
  const {
    selectedGames: newSelection,
    exemptAppId: newExemptAppId,
    aborted,
  } = await selectGames(allGames, accountName, currentSelection);

  // Ctrl+C inside the selector: the idling-screen key handler already started
  // the graceful shutdown; do not repaint over the goodbye message.
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

// Moves user-paused games back into rotation once the block is over. A game
// whose idle phase was interrupted keeps its accumulated-time threshold (the
// phase simply continues; re-rolling would keep a regularly played game out of
// cooldown forever). A game that was in cooldown when the block started and
// whose cooldown ran out meanwhile starts a fresh idle phase, exactly like a
// cooldown exit in tickRandomizer — its old threshold was already reached.
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

// Handles state changes when another session plays a game on this account.
// Steam blocks this whole session while that happens, so every idling game
// freezes, and the played game (if idled) is shown as paused. Only reacts to
// transitions: Steam also echoes playingState(false, appid) after our own
// gamesPlayed calls, and re-sending on every echo would loop forever.
function handlePlayingState(blocked: boolean, playingApp: number): void {
  if (blocked === playingBlocked) return;
  playingBlocked = blocked;
  const now = new Date();

  if (blocked) {
    if (!isWaitingForResume) bankElapsed(idlingGames, now);
    // Server playtime is flat for the whole block; a baseline from before it
    // would read as a zombie strike on the first probe afterwards.
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

  // In edit mode the selector owns the screen and enterEditMode re-sends the
  // final list itself; the array changes above still apply.
  if (isInEditMode || isWaitingForResume) return;
  // Steam ignores gamesPlayed while blocked and does not restore the list on
  // its own afterwards: re-send on unblock, or idling silently stays dead until
  // the next change (up to the 4h flush).
  if (!blocked) client.setGamesPlaying(idlingGames.map((g) => g.appid));
  renderStatus();
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

  // Steam reports a block right after logon, before this handler existed.
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
    // A kick that lands while our flush relog is in flight is still a takeover:
    // the flush is over either way and the pause must be announced.
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

  // Best effort: a throw here must not skip the exit timer below.
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

  // Fallback "quit by user" only fires when idling had started and no give-up
  // path already sent a stop message
  const finalMessage =
    !stopNotified && startTime ? telegram.send('🛑 Idling stopped — quit by user') : Promise.resolve();

  showGoodbye();
  // Grace so the clean logOff socket write (the playtime-commit trigger) can
  // land, and the final Telegram request (own 5s timeout) gets to finish.
  const grace = new Promise((resolve) => setTimeout(resolve, SHUTDOWN_FLUSH_GRACE_MS));
  void Promise.all([grace, finalMessage]).then(() => process.exit(exitCode));
}

// Mitigation C: last-resort flush on a fatal error. Best-effort stop+logout to
// salvage the in-flight session's playtime tail before exiting.
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
    // ignore — best effort
  }
  try {
    if (client.isLoggedIn || client.isConnected) client.logout();
  } catch {
    // ignore — best effort
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
  // Ctrl+C inside an inquirer prompt (raw mode, so no SIGINT) rejects with
  // ExitPromptError — a normal exit, not an error to print.
  if (err.name === 'ExitPromptError') {
    showGoodbye();
    process.exit(0);
  }
  showError(err.message);
  process.exit(1);
});
