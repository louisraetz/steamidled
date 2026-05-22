import SteamUser from 'steam-user';
import type { SteamGame } from '../types/index.js';

// Wrapper class encapsulating Steam user interactions for game idling
export class SteamClient {
  private client: SteamUser;
  private _isLoggedIn = false;
  private _accountName: string | null = null;
  private _ownershipCached = false;
  private _ownershipCachePromise: Promise<void> | null = null;
  private _errorHandler: ((err: Error) => void) | null = null;

  constructor() {
    this.client = new SteamUser({ enablePicsCache: true });

    this.client.on('ownershipCached', () => {
      this._ownershipCached = true;
    });

    // Persistent listeners so we observe every logon (including steam-user's
    // own autoRelogin) and every disconnect, not just those bracketing an
    // explicit login call. Without these, an internal auto-reconnect would
    // leave steam-user holding a session while our code still believed it was
    // disconnected — and a subsequent manual logOn would throw synchronously
    // inside process.nextTick (uncatchable, crashes the process).
    this.client.on('loggedOn', () => {
      this._isLoggedIn = true;
    });

    this.client.on('disconnected', () => {
      this._isLoggedIn = false;
    });

    // A persistent 'error' listener must always exist: steam-user can emit
    // 'error' at any time (e.g. during getOwnedGames, between login and
    // startIdling), and an 'error' event with no listener makes Node's
    // EventEmitter throw and crash the process. Forward to the app-level
    // handler once one is registered via onError.
    this.client.on('error', (err: Error) => {
      this._isLoggedIn = false;
      this._errorHandler?.(err);
    });
  }

  get isLoggedIn(): boolean {
    return this._isLoggedIn;
  }

  // True whenever steam-user currently holds a session, regardless of which
  // code path established it. Source of truth for "is logOn safe to call".
  get isConnected(): boolean {
    return this.client.steamID != null;
  }

  get accountName(): string | null {
    return this._accountName;
  }

  get steamUser(): SteamUser {
    return this.client;
  }

  // Logs in to Steam using a saved refresh token
  loginWithRefreshToken(refreshToken: string, accountName?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const onLoggedOn = () => {
        this._isLoggedIn = true;
        if (accountName) {
          this._accountName = accountName;
        }
        this.client.setPersona(SteamUser.EPersonaState.Online);
        cleanup();
        resolve();
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        this.client.removeListener('loggedOn', onLoggedOn);
        this.client.removeListener('error', onError);
      };

      this.client.on('loggedOn', onLoggedOn);
      this.client.on('error', onError);

      this.client.logOn({ refreshToken });
    });
  }

  // Fetches the user's library: purchased + played free + family-shared games
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

  // Resolves once steam-user has populated the PICS ownership cache
  private waitForOwnershipCache(timeoutMs = 10000): Promise<void> {
    if (this._ownershipCached) return Promise.resolve();
    if (this._ownershipCachePromise) return this._ownershipCachePromise;

    this._ownershipCachePromise = new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.client.removeListener('ownershipCached', onCached);
        resolve();
      }, timeoutMs);

      const onCached = () => {
        clearTimeout(timer);
        resolve();
      };

      this.client.once('ownershipCached', onCached);
    });

    return this._ownershipCachePromise;
  }

  // Returns appids belonging to family-shared (non-owned) licenses
  private async getSharedAppIds(ownAccountId: number): Promise<Set<number>> {
    await this.waitForOwnershipCache();

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

  // Returns true if the appid is only available via free-type licenses owned by us
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
      // billingtype values: 0=NoCost, 3=GuestPass, 5=FreeOnDemand, 12=FreeCommercialLicense
      const freeTypes = new Set([0, 3, 5, 12]);
      if (billingType !== undefined && !freeTypes.has(billingType)) {
        hasPaidLicense = true;
      }
    }

    return hasOwnLicense && !hasPaidLicense;
  }

  // Looks up an app name from the PICS cache (used for shared games not in owned-apps response)
  private getAppNameFromCache(appid: number): string | null {
    const apps = this.client.picsCache?.apps as
      | Record<number, { appinfo?: { common?: { name?: string } } }>
      | undefined;
    return apps?.[appid]?.appinfo?.common?.name ?? null;
  }

  // Sets which games are currently being idled (max 32)
  setGamesPlaying(appIds: number[]): void {
    // No-op on a transient logged-out/disconnected race rather than throwing:
    // these calls fire from timer/event callbacks (tickRandomizer, playingState),
    // and restoreIdling re-sends the full list on reconnect, so state re-syncs on
    // its own. Throwing here would bubble to the global handleCrash net.
    if (!this._isLoggedIn || !this.isConnected) {
      return;
    }

    if (appIds.length > 32) {
      throw new Error('Cannot idle more than 32 games at once');
    }

    this.client.gamesPlayed(appIds);
  }

  // Stops idling all games
  stopPlaying(): void {
    if (!this.isConnected) return;
    this.client.gamesPlayed([]);
  }

  // Forces a clean logOff + auto-reconnect. A clean logOff is Steam's
  // playtime-commit trigger, so a relog flushes the in-flight idle session AND
  // re-validates the session token (killing a zombie) in one primitive. Routes
  // through the existing disconnected/loggedOn handlers.
  relog(): void {
    if (!this.isConnected) {
      throw new Error('Cannot relog: not connected');
    }
    try {
      this.client.relog();
    } catch {
      // Defensive: if native relog is unavailable (no access_token on the logon
      // details), a clean logOff still commits playtime; the app's
      // disconnect→attemptResume path then re-logs with the stored refresh token.
      this.client.logOff();
    }
  }

  // Probes the server-authoritative lifetime playtime for a single app. Used to
  // detect zombie sessions (commits silently not landing). Returns null when the
  // app is absent from the response, which callers must treat as inconclusive,
  // never as "no increase".
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

  // Logs out from Steam and resets state
  logout(): void {
    this.client.logOff();
    this._isLoggedIn = false;
    this._accountName = null;
  }

  // Registers a callback for disconnect events
  onDisconnected(callback: (eresult: number, msg: string) => void): void {
    this.client.on('disconnected', callback);
  }

  // Registers a callback for every successful logon, including steam-user's
  // internal auto-relogins after a transient disconnect.
  onLoggedOn(callback: () => void): void {
    this.client.on('loggedOn', callback);
  }

  // Registers the app-level callback for error events. The raw 'error' listener
  // is attached once in the constructor and forwards here, so registration
  // timing can never leave the process without an 'error' handler.
  onError(callback: (err: Error) => void): void {
    this._errorHandler = callback;
  }

  // Registers a callback for when the user starts or stops playing a game
  onPlayingState(callback: (blocked: boolean, playingApp: number) => void): void {
    this.client.on('playingState', callback);
  }
}
