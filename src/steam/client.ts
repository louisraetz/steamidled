import SteamUser from 'steam-user';
import { LoginSession, EAuthTokenPlatformType } from 'steam-session';
import { MAX_IDLE_GAMES } from '../constants.js';
import { log } from '../logging/logger.js';
import type { PersonaState } from '../settings/schema.js';
import type { SteamGame } from '../types/index.js';

const RECONNECT_PENDING_MAX_MS = 5 * 60 * 1000;
const LOGON_TIMEOUT_MS = 2 * 60 * 1000;
const PERSONA_VALUES: Record<PersonaState, Parameters<SteamUser['setPersona']>[0]> = {
  online: SteamUser.EPersonaState.Online,
  away: SteamUser.EPersonaState.Away,
  offline: SteamUser.EPersonaState.Offline,
};

export class SteamClient {
  private client: SteamUser;
  private _isLoggedIn = false;
  private _accountName: string | null = null;
  private _ownershipCached = false;
  private _ownershipCachePromise: Promise<boolean> | null = null;
  private _ownershipCacheComplete = true;
  private _errorHandler: ((err: Error) => void) | null = null;
  private _reconnectPending = false;
  private _reconnectPendingSince = 0;
  private _manualLogOff = false;
  private _playingBlocked = false;
  private _refreshToken: string | null = null;
  private _refreshTokenHandler: ((refreshToken: string) => void) | null = null;
  private _pendingLogonReject: ((err: Error) => void) | null = null;
  private _personaState: PersonaState = 'online';

  constructor() {
    this.client = new SteamUser({ enablePicsCache: true });

    this.client.on('ownershipCached', () => {
      this._ownershipCached = true;
    });

    this.client.on('loggedOn', () => {
      this._isLoggedIn = true;
      this._reconnectPending = false;
      this._ownershipCached = false;
      this._ownershipCachePromise = null;
      this.client.setPersona(PERSONA_VALUES[this._personaState]);
      void this.renewRefreshToken();
    });

    this.client.on('disconnected', (eresult, msg) => {
      this._isLoggedIn = false;
      this._playingBlocked = false;
      const unansweredLogOff = eresult === 0 && msg === 'Logged off';
      this._reconnectPending = !this._manualLogOff && !unansweredLogOff;
      this._reconnectPendingSince = Date.now();
      this._manualLogOff = false;
    });

    this.client.on('error', (err: Error) => {
      this._isLoggedIn = false;
      this._playingBlocked = false;
      this._reconnectPending = false;
      this._errorHandler?.(err);
    });

    this.client.on('playingState', (blocked: boolean) => {
      this._playingBlocked = blocked;
    });
  }

  get isLoggedIn(): boolean {
    return this._isLoggedIn;
  }

  get isConnected(): boolean {
    return this.client.steamID != null;
  }

  get isReconnecting(): boolean {
    if (this.isConnected || !this._reconnectPending) return false;
    return Date.now() - this._reconnectPendingSince < RECONNECT_PENDING_MAX_MS;
  }

  get isConnecting(): boolean {
    return this.client._connecting === true;
  }

  abortPendingConnect(): void {
    if (this.isConnected) return;
    this.client.logOff();
    this._reconnectPending = false;
    this._pendingLogonReject?.(new Error('Logon cancelled'));
  }

  setPersonaState(state: PersonaState): void {
    this._personaState = state;
    if (this._isLoggedIn && this.isConnected) this.client.setPersona(PERSONA_VALUES[state]);
  }

  get isPlayingBlocked(): boolean {
    return this._playingBlocked;
  }

  get accountName(): string | null {
    return this._accountName;
  }

  get ownershipCacheComplete(): boolean {
    return this._ownershipCacheComplete;
  }

  get licensesReady(): boolean {
    return this.client.licenses != null && this._ownershipCacheComplete;
  }

  get currentRefreshToken(): string | null {
    return this._refreshToken;
  }

  private async renewRefreshToken(): Promise<void> {
    const currentToken = this._refreshToken;
    if (!currentToken) return;
    const session =
      this.client._getLoginSession?.() ?? new LoginSession(EAuthTokenPlatformType.SteamClient);
    session.refreshToken = currentToken;
    try {
      const renewed = await session.renewRefreshToken();
      if (this._refreshToken !== currentToken) return;
      if (renewed && session.refreshToken) {
        this._refreshToken = session.refreshToken;
        if (this.client._logOnDetails) this.client._logOnDetails.access_token = session.refreshToken;
        this._refreshTokenHandler?.(session.refreshToken);
      }
    } catch (err) {
      log.warn('steam', 'Refresh token renewal failed', {
        cause: err,
        hint: 'Nothing to do now. steamidled tries again at the next sign-in.',
        interactive: () => console.error(`Refresh token renewal failed: ${(err as Error).message}`),
      });
    }
  }

  get steamUser(): SteamUser {
    return this.client;
  }

  loginWithRefreshToken(refreshToken: string, accountName?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        reject(new Error('Already logged on'));
        return;
      }
      if (this.isConnecting) {
        reject(new Error('Logon already in progress'));
        return;
      }

      const onLoggedOn = () => {
        this._isLoggedIn = true;
        if (accountName) {
          this._accountName = accountName;
        }
        cleanup();
        resolve();
      };

      this._refreshToken = refreshToken;

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const timer = setTimeout(() => {
        cleanup();
        this.abortPendingConnect();
        reject(new Error('Logon timed out'));
      }, LOGON_TIMEOUT_MS);

      const cleanup = () => {
        clearTimeout(timer);
        this.client.removeListener('loggedOn', onLoggedOn);
        this.client.removeListener('error', onError);
        this._pendingLogonReject = null;
      };

      this._pendingLogonReject = (err: Error) => {
        cleanup();
        reject(err);
      };

      this.client.on('loggedOn', onLoggedOn);
      this.client.on('error', onError);

      this.client.logOn({ refreshToken });
    });
  }

  async getOwnedGames(): Promise<SteamGame[]> {
    if (!this._isLoggedIn || !this.client.steamID) {
      throw new Error('Not logged in');
    }

    const response = await this.client.getUserOwnedApps(this.client.steamID, {
      includePlayedFreeGames: true,
      includeFreeSub: true,
    });

    const ownAccountId = this.client.steamID.accountid;
    const sharedAppIds = await this.getSharedAppIds(ownAccountId);

    const games: SteamGame[] = response.apps.map((app) => {
      const source: SteamGame['source'] = sharedAppIds.has(app.appid)
        ? 'shared'
        : this.isFreeApp(app.appid, ownAccountId)
        ? 'free'
        : 'owned';

      return {
        appid: app.appid,
        name: app.name || `App ${app.appid}`,
        playtime_forever: app.playtime_forever || 0,
        source,
      };
    });

    const seen = new Set(games.map((g) => g.appid));
    for (const appid of sharedAppIds) {
      if (seen.has(appid)) continue;
      games.push({
        appid,
        name: this.getAppNameFromCache(appid) || `App ${appid}`,
        playtime_forever: 0,
        source: 'shared',
      });
    }

    return games;
  }

  private waitForOwnershipCache(timeoutMs = 10000): Promise<boolean> {
    if (this._ownershipCached) return Promise.resolve(true);
    if (this._ownershipCachePromise) return this._ownershipCachePromise;

    this._ownershipCachePromise = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.client.removeListener('ownershipCached', onCached);
        resolve(false);
      }, timeoutMs);

      const onCached = () => {
        clearTimeout(timer);
        resolve(true);
      };

      this.client.once('ownershipCached', onCached);
    });

    return this._ownershipCachePromise;
  }

  private async getSharedAppIds(ownAccountId: number): Promise<Set<number>> {
    const cached = await this.waitForOwnershipCache();
    this._ownershipCacheComplete = cached;
    if (!cached) {
      log.warn('steam', 'License data did not arrive in time', {
        hint: 'Family-shared games may be missing and free/paid tags may be off. Restart to retry.',
        interactive: () =>
          console.error(
            'License data did not arrive in time — family-shared games may be missing and free/paid tags may be off. Restart to retry.'
          ),
      });
    }

    const sharedAppIds = new Set<number>();
    const licenses = this.client.licenses;
    const packages = this.client.picsCache?.packages;

    if (!licenses || !packages) return sharedAppIds;

    for (const license of licenses) {
      if (license.owner_id === ownAccountId) continue;
      const pkg = packages[license.package_id];
      const appids = pkg?.packageinfo?.appids;
      if (!appids) continue;
      for (const appid of appids) {
        sharedAppIds.add(appid);
      }
    }

    return sharedAppIds;
  }

  private isFreeApp(appid: number, ownAccountId: number): boolean {
    const licenses = this.client.licenses;
    const packages = this.client.picsCache?.packages;
    if (!licenses || !packages) return false;

    let hasOwnLicense = false;
    let hasPaidLicense = false;

    for (const license of licenses) {
      if (license.owner_id !== ownAccountId) continue;
      const pkg = packages[license.package_id];
      const appids = pkg?.packageinfo?.appids;
      if (!appids?.includes(appid)) continue;

      hasOwnLicense = true;
      const billingType = (pkg?.packageinfo as { billingtype?: number } | undefined)?.billingtype;
      const freeTypes = new Set([0, 3, 5, 12]);
      if (billingType !== undefined && !freeTypes.has(billingType)) {
        hasPaidLicense = true;
      }
    }

    return hasOwnLicense && !hasPaidLicense;
  }

  private getAppNameFromCache(appid: number): string | null {
    const apps = this.client.picsCache?.apps as
      | Record<number, { appinfo?: { common?: { name?: string } } }>
      | undefined;
    return apps?.[appid]?.appinfo?.common?.name ?? null;
  }

  setGamesPlaying(appIds: number[]): void {
    if (!this._isLoggedIn || !this.isConnected) {
      return;
    }

    if (appIds.length > MAX_IDLE_GAMES) {
      throw new Error(`Cannot idle more than ${MAX_IDLE_GAMES} games at once`);
    }

    this.client.gamesPlayed(appIds);
  }

  stopPlaying(): void {
    if (!this.isConnected) return;
    this.client.gamesPlayed([]);
  }

  relog(): void {
    if (!this.isConnected) {
      throw new Error('Cannot relog: not connected');
    }
    try {
      this.client.relog();
    } catch {
      this._manualLogOff = true;
      this.client.logOff();
    }
  }

  async getPlaytimeForever(appid: number): Promise<number | null> {
    if (!this._isLoggedIn || !this.client.steamID) {
      throw new Error('Not logged in');
    }

    const response = await this.client.getUserOwnedApps(this.client.steamID, {
      filterAppids: [appid],
      includeAppInfo: false,
      includePlayedFreeGames: true,
      includeFreeSub: true,
    });

    return response.apps[0]?.playtime_forever ?? null;
  }

  logout(): void {
    if (this.isConnected) this._manualLogOff = true;
    this.client.logOff();
    this._isLoggedIn = false;
    this._accountName = null;
    this._refreshToken = null;
    this._ownershipCached = false;
    this._ownershipCachePromise = null;
  }

  onDisconnected(callback: (eresult: number, msg: string) => void): void {
    this.client.on('disconnected', callback);
  }

  onRefreshToken(callback: (refreshToken: string) => void): void {
    this._refreshTokenHandler = callback;
  }

  onLoggedOn(callback: () => void): void {
    this.client.on('loggedOn', callback);
  }

  onError(callback: (err: Error) => void): void {
    this._errorHandler = callback;
  }

  onPlayingState(callback: (blocked: boolean, playingApp: number) => void): void {
    this.client.on('playingState', callback);
  }
}
