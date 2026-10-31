import { LoginSession, EAuthTokenPlatformType, EAuthSessionGuardType } from 'steam-session';
import SteamUser from 'steam-user';
import type { SteamClient } from './client.js';
import { completeLogin, LOGIN_TIMEOUT_MS, GUARD_CODE_ATTEMPTS } from './auth.js';
import { clearCredentials } from '../storage/credentials.js';
import { RATE_LIMIT_ERESULTS } from '../constants.js';
import { log } from '../logging/logger.js';
import type { GuardType, LoginFlowState } from '../web/types.js';

type LoginMethod = 'qr' | 'password';

interface GuardAction {
  type: number;
  detail?: string;
}

interface GuardStep {
  guard: GuardType;
  emailDomain: string | null;
  codeAllowed: boolean;
}

export interface LoginFlowCallbacks {
  onChange: () => void;
  onLoggedIn: (accountName: string) => void;
}

export class LoginFlowError extends Error {}

const WRONG_CREDENTIALS_ERESULTS = new Set<number>([5, 18]);

function describeLoginError(err: unknown): string {
  const e = err as Error & { eresult?: number };
  if (e.eresult !== undefined && WRONG_CREDENTIALS_ERESULTS.has(e.eresult)) {
    return 'Wrong account name or password.';
  }
  if (e.eresult !== undefined && RATE_LIMIT_ERESULTS.has(e.eresult)) {
    return 'Too many sign-in attempts';
  }
  if (e.eresult !== undefined) {
    return `Steam refused the sign-in (${SteamUser.EResult[e.eresult] ?? `eresult ${e.eresult}`}).`;
  }
  return `Couldn't reach Steam (${e.message || 'unknown error'}).`;
}

function guardStepOf(validActions: GuardAction[] | undefined): GuardStep | null {
  const actions = validActions ?? [];
  const codeAction = actions.find(
    (a) => a.type === EAuthSessionGuardType.EmailCode || a.type === EAuthSessionGuardType.DeviceCode
  );
  const deviceConfirmation = actions.some((a) => a.type === EAuthSessionGuardType.DeviceConfirmation);
  const emailConfirmation = actions.some((a) => a.type === EAuthSessionGuardType.EmailConfirmation);
  const emailAction = actions.find(
    (a) =>
      (a.type === EAuthSessionGuardType.EmailCode || a.type === EAuthSessionGuardType.EmailConfirmation) &&
      a.detail
  );

  let guard: GuardType | null = null;
  if (deviceConfirmation) guard = 'device-confirmation';
  else if (emailConfirmation) guard = 'email-confirmation';
  else if (codeAction?.type === EAuthSessionGuardType.EmailCode) guard = 'email-code';
  else if (codeAction) guard = 'device-code';
  if (!guard) return null;

  return { guard, emailDomain: emailAction?.detail ?? null, codeAllowed: Boolean(codeAction) };
}

export class LoginFlow {
  private session: LoginSession | null = null;
  private current: LoginFlowState | null = null;
  private attempt = 0;

  constructor(
    private readonly client: SteamClient,
    private readonly callbacks: LoginFlowCallbacks
  ) {}

  get state(): LoginFlowState | null {
    return this.current;
  }

  async startQr(): Promise<void> {
    const { session, attempt } = this.begin();
    this.current = null;
    this.wireSession(session, attempt, 'qr', null);
    try {
      const result = await session.startWithQR();
      if (!this.isCurrent(attempt)) return;
      if (!result.qrChallengeUrl) {
        this.fail(attempt, 'qr', 'Steam did not return a QR code. Try again.');
        return;
      }
      this.setState({
        method: 'qr',
        status: 'pending',
        challengeUrl: result.qrChallengeUrl,
        expiresAt: Date.now() + LOGIN_TIMEOUT_MS,
      });
    } catch (err) {
      if (!this.isCurrent(attempt)) return;
      this.fail(attempt, 'qr', describeLoginError(err));
    }
  }

  async startPassword(accountName: string, password: string): Promise<void> {
    const { session, attempt } = this.begin();
    this.setState({ method: 'password', status: 'authenticating' });
    this.wireSession(session, attempt, 'password', accountName);
    try {
      const result = await session.startWithCredentials({ accountName, password });
      if (!this.isCurrent(attempt) || !result.actionRequired) return;
      const step = guardStepOf(result.validActions as GuardAction[] | undefined);
      if (!step) {
        this.fail(attempt, 'password', 'Steam asked for a sign-in step steamidled does not support.');
        return;
      }
      this.setState({ method: 'password', status: 'guard', ...step, triesLeft: GUARD_CODE_ATTEMPTS });
    } catch (err) {
      if (!this.isCurrent(attempt)) return;
      this.fail(attempt, 'password', describeLoginError(err));
    }
  }

  async submitGuardCode(code: string): Promise<void> {
    const state = this.current;
    const session = this.session;
    if (!session || state?.status !== 'guard' || !state.codeAllowed) {
      throw new LoginFlowError('No Steam Guard code is expected right now.');
    }
    const attempt = this.attempt;
    try {
      await session.submitSteamGuardCode(code);
      if (this.isCurrent(attempt) && this.current?.status === 'guard') {
        this.setState({ method: 'password', status: 'authenticating' });
      }
    } catch {
      const latest = this.current;
      if (!this.isCurrent(attempt) || latest?.status !== 'guard') return;
      const triesLeft = latest.triesLeft - 1;
      if (triesLeft > 0) {
        this.setState({ ...latest, triesLeft });
        return;
      }
      log.warn('login', 'Steam Guard rejected three codes', { hint: 'Sign in again to get a new code.' });
      this.cancelSession();
      this.setState({ method: 'password', status: 'error', message: 'Too many wrong codes' });
    }
  }

  cancel(): void {
    this.cancelSession();
    if (this.current === null) return;
    this.setState(null);
  }

  private begin(): { session: LoginSession; attempt: number } {
    this.cancelSession();
    const session = new LoginSession(EAuthTokenPlatformType.SteamClient);
    session.loginTimeout = LOGIN_TIMEOUT_MS;
    this.session = session;
    return { session, attempt: this.attempt };
  }

  private cancelSession(): void {
    this.attempt += 1;
    const session = this.session;
    this.session = null;
    if (!session) return;
    try {
      session.cancelLoginAttempt();
    } catch {
      return;
    }
  }

  private isCurrent(attempt: number): boolean {
    return attempt === this.attempt;
  }

  private setState(state: LoginFlowState | null): void {
    this.current = state;
    this.callbacks.onChange();
  }

  private fail(attempt: number, method: LoginMethod, message: string): void {
    if (!this.isCurrent(attempt)) return;
    this.cancelSession();
    log.warn('login', `Sign-in failed: ${message}`);
    this.setState({ method, status: 'error', message });
  }

  private wireSession(
    session: LoginSession,
    attempt: number,
    method: LoginMethod,
    typedAccountName: string | null
  ): void {
    session.on('remoteInteraction', () => {
      if (!this.isCurrent(attempt) || method !== 'qr') return;
      this.setState({ method: 'qr', status: 'scanned' });
    });

    session.on('timeout', () => {
      if (!this.isCurrent(attempt)) return;
      this.session = null;
      this.attempt += 1;
      log.info('login', 'Sign-in request expired after 2 minutes');
      this.setState({ method, status: 'expired' });
    });

    session.on('error', (err: Error) => {
      this.fail(attempt, method, describeLoginError(err));
    });

    session.on('authenticated', () => {
      void this.finishLogin(session, attempt, method, typedAccountName).catch((err: unknown) => {
        log.error('login', 'Sign-in could not be completed', { cause: err });
        this.fail(attempt, method, 'Sign-in could not be completed. Try again.');
      });
    });
  }

  private async finishLogin(
    session: LoginSession,
    attempt: number,
    method: LoginMethod,
    typedAccountName: string | null
  ): Promise<void> {
    if (!this.isCurrent(attempt)) return;
    const refreshToken = session.refreshToken;
    const accountName = session.accountName || typedAccountName;
    if (!refreshToken || !accountName) {
      this.fail(attempt, method, 'Steam did not return a login token. Try again.');
      return;
    }
    if (method === 'password') this.setState({ method: 'password', status: 'authenticating' });

    const result = await completeLogin(this.client, { accountName, refreshToken });
    if (!this.isCurrent(attempt)) {
      if (result.success) {
        this.client.logout();
        clearCredentials();
      }
      return;
    }
    this.session = null;
    if (!result.success) {
      const message =
        result.eresult === undefined
          ? result.error ?? 'Sign-in failed. Try again.'
          : describeLoginError(Object.assign(new Error(result.error), { eresult: result.eresult }));
      this.fail(attempt, method, message);
      return;
    }
    this.attempt += 1;
    this.current = null;
    log.info('login', `Signed in as ${accountName}`);
    this.callbacks.onLoggedIn(accountName);
  }
}
