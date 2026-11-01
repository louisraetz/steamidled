import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import SteamUser from 'steam-user';
import { hasStoredLogin, loginWithStoredCredentials } from '../steam/auth.js';
import { LoginFlow, LoginFlowError } from '../steam/loginFlow.js';
import { INVALID_TOKEN_ERESULTS, RATE_LIMIT_ERESULTS, TERMINAL_ERESULTS } from '../constants.js';
import { log, type LogScope } from '../logging/logger.js';
import { formatWait } from '../utils/format.js';
import { displayUrl, listenProblem, readWebHost, readWebPort } from './config.js';
import { CommandError } from './errors.js';
import { buildSnapshot, connectionOf, phaseOf } from './snapshot.js';
import { createApp, startWebServer, stopWebServer } from './server.js';
import { TelegramFlow } from './telegramFlow.js';
import type { ScheduleRejection, ScheduleResult } from '../core/schedule.js';
import type { SettingsPatch } from '../settings/schema.js';
import type { ControllerPhase, ControllerState, Engine, WebBridge } from './engine.js';
import type { DaemonSnapshot, LibraryGame, Phase, TelegramConfirmResult, TelegramNotifyPrefs } from './types.js';

const RETRY_COOLDOWN_MS = 60_000;
const EXIT_CONFIG = 2;

const SIGNED_OUT_ERROR = {
  title: 'Steam signed you out',
  message:
    'The saved login expired or was revoked. Sign in again to resume idling. Favorites and Telegram stay set up.',
};

interface Epoch {
  id: number;
  signal: AbortSignal;
}

interface ErrorInfo {
  message: string;
  hint: string;
}

type ErrorSource = 'startup' | 'resume';

const SCHEDULE_REJECTIONS: Record<ScheduleRejection, CommandError> = {
  'not-in-session': new CommandError(404, 'This game is not idling right now.', 'Reload the page.'),
  paused: new CommandError(409, 'This game is paused while you play it on another device.', 'It continues on its own when you stop playing.'),
  exempt: new CommandError(409, 'Turn off No cooldown first.', 'This game skips cooldowns until you turn it off.'),
  'not-collecting': new CommandError(409, 'This game is already cooling down.', 'Reload the page.'),
  'not-cooling': new CommandError(409, 'This game is not cooling down.', 'Reload the page.'),
};

function eresultLabel(eresult: number): string {
  return SteamUser.EResult[eresult] ?? `eresult ${eresult}`;
}

export class WebController {
  readonly events = new EventEmitter();
  readonly loginFlow: LoginFlow;
  private readonly telegram: TelegramFlow;
  private phase: ControllerPhase = 'signing-in';
  private loginError: ControllerState['loginError'] = null;
  private error: ErrorInfo | null = null;
  private errorSource: ErrorSource = 'startup';
  private nextRetryAt: number | null = null;
  private storedFavorites: number[] = [];
  private epochId = 0;
  private epochAbort = new AbortController();
  private queue: Promise<unknown> = Promise.resolve();
  private changePending = false;
  private lastRetryAt = 0;

  constructor(private readonly engine: Engine) {
    this.events.setMaxListeners(0);
    this.loginFlow = new LoginFlow(engine.client, {
      onChange: () => this.changed(),
      onLoggedIn: (accountName) => this.handleBrowserLogin(accountName),
    });
    this.telegram = new TelegramFlow(engine.telegram, () => this.changed());
  }

  changed(): void {
    if (this.changePending) return;
    this.changePending = true;
    queueMicrotask(() => {
      this.changePending = false;
      this.events.emit('state');
    });
  }

  snapshot(): DaemonSnapshot {
    return buildSnapshot(this.controllerState(), this.engine.state(), {
      version: this.engine.version,
      startedAt: this.engine.startedAt,
      now: Date.now(),
    });
  }

  library(): LibraryGame[] {
    const state = this.engine.state();
    if (!state.libraryLoaded) {
      throw new CommandError(409, 'The library is not loaded yet.', 'It loads right after the Steam sign-in.');
    }
    return state.allGames.map((game) => ({
      appid: game.appid,
      name: game.name,
      playtimeMinutes: game.source === 'shared' ? null : game.playtime_forever,
      source: game.source,
    }));
  }

  start(): void {
    this.telegram.load();
    if (!hasStoredLogin()) {
      this.setPhase('needs-login');
      return;
    }
    const epoch = this.renewEpoch();
    this.runDetached(() => this.signInWithStored(epoch), 'steam');
  }

  shutdown(): void {
    this.renewEpoch();
    this.loginFlow.cancel();
  }

  handleSessionInvalid(signedOut: boolean): void {
    this.renewEpoch();
    this.loginFlow.cancel();
    this.loginError = signedOut ? SIGNED_OUT_ERROR : null;
    this.error = null;
    this.nextRetryAt = null;
    this.setPhase('needs-login');
  }

  handleSessionFatal(error: ErrorInfo): void {
    this.setError(error, 'resume');
  }

  setSelection(appIds: number[]): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.requireSession();
      const state = this.engine.state();
      const unknown = appIds.find((appid) => !state.gamesById.has(appid));
      if (unknown !== undefined) {
        throw new CommandError(422, `App ${unknown} is not in your library.`, 'Reload the page and pick again.');
      }
      if (appIds.length > 0) this.requireApplyAllowed();
      this.engine.applySelection(appIds);
      return this.snapshot();
    });
  }

  stopIdling(): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.requireSession();
      this.engine.stop();
      return this.snapshot();
    });
  }

  startFavorites(): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.requireSession();
      this.requireApplyAllowed();
      if (this.engine.startFavorites() === 0) {
        throw new CommandError(422, 'None of your favorites are in this library.', 'Mark games as favorites in Library first.');
      }
      return this.snapshot();
    });
  }

  setFavorite(appId: number, favorite: boolean): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.requireLibrary();
      const state = this.engine.state();
      if (favorite && !state.gamesById.has(appId)) {
        throw new CommandError(422, `App ${appId} is not in your library.`, 'Reload the page and try again.');
      }
      if (!this.engine.setFavorite(appId, favorite)) {
        throw new CommandError(500, "Couldn't save favorites.", 'Check that ~/.steam-idler is writable.');
      }
      return this.snapshot();
    });
  }

  setExempt(appId: number | null): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.requireLibrary();
      if (appId !== null && !this.engine.state().gamesById.has(appId)) {
        throw new CommandError(422, `App ${appId} is not in your library.`, 'Reload the page and try again.');
      }
      if (!this.engine.setExempt(appId)) {
        throw new CommandError(500, "Couldn't save the exempt game.", 'Check that ~/.steam-idler is writable.');
      }
      return this.snapshot();
    });
  }

  loginQr(): Promise<DaemonSnapshot> {
    return this.enqueue(async () => {
      this.requireNeedsLogin();
      this.renewEpoch();
      await this.loginFlow.startQr();
      return this.snapshot();
    });
  }

  loginPassword(accountName: string, password: string): Promise<DaemonSnapshot> {
    return this.enqueue(async () => {
      this.requireNeedsLogin();
      this.renewEpoch();
      await this.loginFlow.startPassword(accountName, password);
      return this.snapshot();
    });
  }

  loginGuard(code: string): Promise<DaemonSnapshot> {
    return this.enqueue(async () => {
      this.requireNeedsLogin();
      try {
        await this.loginFlow.submitGuardCode(code);
      } catch (err) {
        if (err instanceof LoginFlowError) throw new CommandError(409, err.message, 'Start the sign-in again.');
        throw err;
      }
      return this.snapshot();
    });
  }

  loginCancel(): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.requireNeedsLogin();
      this.loginFlow.cancel();
      return this.snapshot();
    });
  }

  logout(): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      if (this.currentPhase() === 'needs-login') {
        throw new CommandError(409, 'Not signed in.', null);
      }
      this.renewEpoch();
      this.loginFlow.cancel();
      this.engine.logout();
      this.storedFavorites = [];
      this.loginError = null;
      this.error = null;
      this.nextRetryAt = null;
      this.setPhase('needs-login');
      return this.snapshot();
    });
  }

  retry(): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      if (this.phase !== 'error') return this.retryResumeNow();
      const now = Date.now();
      this.requireRetryCooldown(now);
      this.lastRetryAt = now;
      const epoch = this.renewEpoch();
      const source = this.errorSource;
      this.error = null;
      const state = this.engine.state();
      if (source === 'resume') {
        this.setPhase('active');
        this.engine.retryResume();
      } else if (this.engine.client.isConnected && state.accountName) {
        this.runDetached(() => this.loadLibraryAndStart(epoch), 'steam');
      } else {
        this.runDetached(() => this.signInWithStored(epoch), 'steam');
      }
      return this.snapshot();
    });
  }

  flushNow(): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.requireSession();
      const result = this.engine.flushNow();
      if (result.ok) return this.snapshot();
      if (result.reason === 'too-soon') {
        throw new CommandError(
          429,
          `Playtime was committed moments ago. Try again in ${formatWait(result.waitMs)}.`,
          'Every commit reconnects to Steam, so steamidled spaces them out.'
        );
      }
      throw new CommandError(
        409,
        'Playtime can be committed while games collect and Steam is connected.',
        'Wait until the current reconnect is done.'
      );
    });
  }

  refreshLibrary(): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.requireSession();
      this.requireConnected('The library can refresh once Steam is connected.');
      if (!this.engine.refreshLibrary()) {
        throw new CommandError(409, 'The library is already refreshing.', null);
      }
      return this.snapshot();
    });
  }

  updateSettings(patch: SettingsPatch): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      const result = this.engine.updateSettings(patch);
      if (result.ok) return this.snapshot();
      if (result.reason === 'invalid') throw new CommandError(422, result.message, 'Adjust the value and try again.');
      throw new CommandError(500, 'The settings file is not writable.', 'Check that ~/.steam-idler is writable.');
    });
  }

  rerollSchedules(): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.requireSession();
      this.engine.rerollSchedules();
      return this.snapshot();
    });
  }

  endAllCooldowns(): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.requireSession();
      this.engine.endAllCooldowns();
      return this.snapshot();
    });
  }

  coolDownNow(appId: number, hours: number | null): Promise<DaemonSnapshot> {
    return this.scheduleCommand(() => this.engine.coolDownNow(appId, hours));
  }

  endCooldownNow(appId: number): Promise<DaemonSnapshot> {
    return this.scheduleCommand(() => this.engine.endCooldownNow(appId));
  }

  setNextCooldownIn(appId: number, hours: number): Promise<DaemonSnapshot> {
    return this.scheduleCommand(() => this.engine.setNextCooldownIn(appId, hours));
  }

  setCooldownRemaining(appId: number, hours: number): Promise<DaemonSnapshot> {
    return this.scheduleCommand(() => this.engine.setCooldownRemaining(appId, hours));
  }

  telegramNotify(partial: Partial<TelegramNotifyPrefs>): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.telegram.updateNotify(partial);
      return this.snapshot();
    });
  }

  async telegramTest(): Promise<DaemonSnapshot> {
    await this.enqueue(() => this.telegram.requireConnected());
    await this.telegram.sendTest();
    return this.snapshot();
  }

  async telegramReport(): Promise<DaemonSnapshot> {
    const report = await this.enqueue(() => {
      this.telegram.requireConnected();
      return this.engine.dailyReport();
    });
    await this.telegram.sendReport(report);
    return this.snapshot();
  }

  telegramToken(token: string): Promise<DaemonSnapshot> {
    return this.enqueue(async () => {
      await this.telegram.submitToken(token);
      return this.snapshot();
    });
  }

  telegramConfirm(): Promise<TelegramConfirmResult> {
    return this.enqueue(() => this.telegram.confirm());
  }

  telegramDisable(): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.telegram.disable();
      return this.snapshot();
    });
  }

  private controllerState(): ControllerState {
    return {
      phase: this.phase,
      loginError: this.loginError,
      error: this.error,
      login: this.loginFlow.state,
      telegram: this.telegram.snapshot(),
      nextRetryAt: this.nextRetryAt,
      storedFavorites: this.storedFavorites,
    };
  }

  private currentPhase(): Phase {
    return phaseOf(this.controllerState(), this.engine.state());
  }

  private requireNeedsLogin(): void {
    if (this.currentPhase() !== 'needs-login') {
      throw new CommandError(409, 'Already signed in to Steam.', 'Log out first to switch accounts.');
    }
  }

  private requireSession(): void {
    const phase = this.currentPhase();
    if (phase !== 'ready' && phase !== 'idling') {
      throw new CommandError(409, 'Idling can change once the library is loaded.', 'Wait until the sign-in is done.');
    }
  }

  private requireConnected(message: string): void {
    const connection = connectionOf(this.currentPhase(), this.engine.state(), Date.now());
    if (connection.state !== 'connected') {
      throw new CommandError(409, message, 'Wait until Steam is connected again.');
    }
  }

  private requireRetryCooldown(now: number): void {
    if (now - this.lastRetryAt < RETRY_COOLDOWN_MS) {
      throw new CommandError(429, 'Wait a minute before trying again.', 'Steam blocks sign-ins that come too often.');
    }
  }

  private retryResumeNow(): DaemonSnapshot {
    const phase = this.currentPhase();
    if (phase !== 'ready' && phase !== 'idling') throw new CommandError(409, 'Nothing to retry.', null);
    const now = Date.now();
    this.requireRetryCooldown(now);
    const result = this.engine.retryNow();
    if (result.ok) {
      this.lastRetryAt = now;
      return this.snapshot();
    }
    if (result.reason === 'rate-limited') {
      throw new CommandError(
        429,
        `Steam is rate limiting sign-ins. Try again in ${formatWait(result.waitMs)}.`,
        'Every early sign-in extends the lockout.'
      );
    }
    if (result.reason === 'busy') {
      throw new CommandError(409, 'A reconnect attempt is already running.', 'Wait a moment.');
    }
    if (result.reason === 'taken-over') {
      throw new CommandError(
        409,
        'This account is in use on another device.',
        'steamidled takes the session back on its own in a few minutes.'
      );
    }
    throw new CommandError(409, 'Nothing to retry.', null);
  }

  private scheduleCommand(command: () => ScheduleResult): Promise<DaemonSnapshot> {
    return this.enqueue(() => {
      this.requireSession();
      const result = command();
      if (!result.ok) throw SCHEDULE_REJECTIONS[result.reason];
      return this.snapshot();
    });
  }

  private requireApplyAllowed(): void {
    const state = this.engine.state();
    const busy = state.idlingGames.length + state.pausedGames.length + state.pausingGames.length > 0;
    const connection = connectionOf(this.currentPhase(), state, Date.now());
    if (busy && connection.state !== 'connected') {
      throw new CommandError(422, 'Apply is available once Steam is connected.', 'Your changes stay pending until then.');
    }
  }

  private requireLibrary(): void {
    const phase = this.currentPhase();
    const allowed = phase === 'ready' || phase === 'idling' || phase === 'error';
    if (!allowed || !this.engine.state().libraryLoaded) {
      throw new CommandError(409, 'The library is not loaded yet.', 'It loads right after the Steam sign-in.');
    }
  }

  private enqueue<T>(task: () => T | Promise<T>): Promise<T> {
    const run = this.queue.then(() => task());
    this.queue = run.catch(() => undefined);
    return run;
  }

  private renewEpoch(): Epoch {
    this.epochAbort.abort();
    this.epochAbort = new AbortController();
    this.epochId += 1;
    return { id: this.epochId, signal: this.epochAbort.signal };
  }

  private isCurrent(epoch: Epoch): boolean {
    return epoch.id === this.epochId;
  }

  private async wait(ms: number, epoch: Epoch): Promise<boolean> {
    try {
      await sleep(ms, undefined, { signal: epoch.signal });
    } catch {
      return false;
    }
    return this.isCurrent(epoch);
  }

  private setPhase(phase: ControllerPhase): void {
    this.phase = phase;
    this.changed();
  }

  private setError(error: ErrorInfo, source: ErrorSource): void {
    this.error = error;
    this.errorSource = source;
    this.nextRetryAt = null;
    this.setPhase('error');
  }

  private runDetached(task: () => Promise<void>, scope: LogScope): void {
    void task().catch((err: unknown) => {
      log.error(scope, 'Unexpected failure in the web controller', {
        cause: err,
        hint: 'Use Try again in the web GUI. If it keeps failing, restart steamidled.',
      });
      this.setError(
        {
          message: 'Something unexpected went wrong in steamidled',
          hint: 'Try again. If it keeps failing, restart steamidled and check its log.',
        },
        'startup'
      );
    });
  }

  private handleBrowserLogin(accountName: string): void {
    const epoch = this.renewEpoch();
    this.loginError = null;
    this.runDetached(() => this.afterLogin(accountName, epoch), 'login');
  }

  private async signInWithStored(epoch: Epoch): Promise<void> {
    this.nextRetryAt = null;
    this.storedFavorites = this.engine.storedFavorites();
    this.setPhase('signing-in');
    let attempt = 0;
    while (this.isCurrent(epoch)) {
      if (!hasStoredLogin()) {
        this.setPhase('needs-login');
        return;
      }
      const result = await loginWithStoredCredentials(this.engine.client);
      if (!this.isCurrent(epoch)) return;
      if (result.success && result.accountName) {
        log.info('steam', `Signed in as ${result.accountName}`);
        this.nextRetryAt = null;
        await this.afterLogin(result.accountName, epoch);
        return;
      }
      const code = result.eresult;
      if (code !== undefined && INVALID_TOKEN_ERESULTS.has(code)) {
        log.warn('steam', `The saved login is no longer valid (${eresultLabel(code)})`, {
          hint: 'Sign in again in the web GUI.',
        });
        this.handleSessionInvalid(true);
        return;
      }
      if (code !== undefined && TERMINAL_ERESULTS.has(code)) {
        log.error('steam', `Steam refused the saved login (${eresultLabel(code)})`, {
          hint: 'Check the account in the Steam app, then use Try again.',
        });
        this.setError(
          {
            message: `Steam refused the saved login (${eresultLabel(code)})`,
            hint: 'This does not fix itself. Check the account in the Steam app, then try again.',
          },
          'startup'
        );
        return;
      }
      attempt += 1;
      const rateLimited = code !== undefined && RATE_LIMIT_ERESULTS.has(code);
      const waitMs = this.engine.loginRetryDelay(rateLimited, attempt);
      this.nextRetryAt = Date.now() + waitMs;
      this.changed();
      log.warn('steam', rateLimited ? 'Steam is rate limiting sign-ins' : `Sign-in failed: ${result.error ?? 'unknown error'}`, {
        hint: `Nothing to do. steamidled tries again in ${formatWait(waitMs)}.`,
      });
      if (!(await this.wait(waitMs, epoch))) return;
      this.nextRetryAt = null;
      this.changed();
    }
  }

  private async afterLogin(accountName: string, epoch: Epoch): Promise<void> {
    if (!this.isCurrent(epoch)) return;
    this.loginError = null;
    this.storedFavorites = this.engine.storedFavorites();
    const start = this.engine.beginSession(accountName);
    if (start === 'resumed') {
      log.info('idle', 'Signed in again, the frozen session resumes');
      this.setPhase('active');
      return;
    }
    await this.loadLibraryAndStart(epoch);
  }

  private async loadLibraryAndStart(epoch: Epoch): Promise<void> {
    this.nextRetryAt = null;
    this.setPhase('loading-library');
    let attempt = 0;
    while (this.isCurrent(epoch)) {
      try {
        const count = await this.engine.loadLibrary();
        if (!this.isCurrent(epoch) || count === null) return;
        this.nextRetryAt = null;
        this.phase = 'active';
        this.engine.startFavorites();
        this.changed();
        return;
      } catch (err) {
        if (!this.isCurrent(epoch)) return;
        attempt += 1;
        const waitMs = this.engine.loginRetryDelay(false, attempt);
        this.nextRetryAt = Date.now() + waitMs;
        this.changed();
        log.warn('steam', "Couldn't load the library", {
          cause: err,
          hint: `Nothing to do. steamidled tries again in ${formatWait(waitMs)}.`,
        });
        if (!(await this.wait(waitMs, epoch))) return;
      }
    }
  }
}

export async function startWebController(engine: Engine): Promise<WebBridge> {
  const port = readWebPort();
  if (port === null) {
    log.error('web', `Invalid STEAMIDLED_WEB_PORT "${process.env.STEAMIDLED_WEB_PORT}"`, {
      hint: 'Set it to a whole number between 1 and 65535.',
    });
    process.exit(EXIT_CONFIG);
  }
  const host = readWebHost();
  const controller = new WebController(engine);
  const app = createApp(controller);

  try {
    await startWebServer(app, port, host);
  } catch (err) {
    const { message, hint } = listenProblem((err as NodeJS.ErrnoException).code, host, port);
    log.error('web', message, { cause: err, hint });
    process.exit(EXIT_CONFIG);
  }
  log.info('web', `Web GUI ready on ${displayUrl(host, port)}`);

  controller.start();

  return {
    changed: () => controller.changed(),
    sessionInvalid: (signedOut) => controller.handleSessionInvalid(signedOut),
    sessionFatal: (error) => controller.handleSessionFatal(error),
    stop: () => {
      controller.shutdown();
      stopWebServer();
    },
  };
}
