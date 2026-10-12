import SteamUser from 'steam-user';
import { LoginSession, EAuthTokenPlatformType } from 'steam-session';
import { MAX_IDLE_GAMES } from '../constants.js';
import type { SteamGame } from '../types/index.js';

// How long the app defers to steam-user's own reconnect loop after a non-fatal
// disconnect. The loop does not always end in loggedOn or error: a refused CM
// connect makes it give up silently, and CM connect timeouts keep it spinning
// with _connecting held. After this, the app reclaims the connection itself.
const RECONNECT_PENDING_MAX_MS = 5 * 60 * 1000;
// Bound on a single logOn attempt. steam-user can abandon a connect silently
// (connection refused during auth), which would otherwise leave the promise —
// and a headless start — pending forever.
const LOGON_TIMEOUT_MS = 2 * 60 * 1000;

// Wrapper class encapsulating Steam user interactions for game idling
export class SteamClient {
  private client: SteamUser;
  private _isLoggedIn = false;
  private _accountName: string | null = null;
  private _ownershipCached = false;
  private _ownershipCachePromise: Promise<boolean> | null = null;
  // False when the library was built before license data arrived (10s timeout)
  private _ownershipCacheComplete = true;
  private _errorHandler: ((err: Error) => void) | null = null;
  // True while steam-user runs its own reconnect loop after a non-fatal
  // disconnect (or a relog). Calling logOn in that window throws "Already
  // attempting to log on" from inside process.nextTick — uncatchable.
  private _reconnectPending = false;
  private _reconnectPendingSince = 0;
  // Set right before a plain logOff we initiate (shutdown, relog fallback), so
  // the resulting 'disconnected' event is not mistaken for a pending reconnect.
  private _manualLogOff = false;
  private _playingBlocked = false;
  // The token the current session was established with; replaced by Steam's
  // renewal. Preferred over the on-disk copy, which can fail to persist.
  private _refreshToken: string | null = null;
  private _refreshTokenHandler: ((refreshToken: string) => void) | null = null;

  constructor() {
    // Refresh tokens expire after a few months; without renewal a 24/7 daemon
    // dies with Expired and needs a manual re-login. steam-user's own
    // renewRefreshTokens option is NOT used: it awaits the renewal inside its
    // logon handler without a catch, so any non-OK reply from Steam becomes an
    // unhandled rejection. The renewal is done here, where it can fail safely.
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
      this._reconnectPending = false;
      // Persona resets to Offline on every fresh session — including relog and
      // steam-user's silent autoRelogin, both of which bypass
      // loginWithRefreshToken. Re-assert Online here so a flush relog never
      // leaves the account invisible/offline.
      this.client.setPersona(SteamUser.EPersonaState.Online);
      void this.renewRefreshToken();
    });

    // steam-user emits 'disconnected' (instead of 'error') exactly when it will
    // reconnect on its own — unless the logOff was ours (then it stays off), or
    // Steam never answered our ClientLogOff: that 4s fallback in _disconnect
    // emits (0, 'Logged off') directly and enqueues no reconnect, unlike every
    // path through _handleLogOff. Both cases leave the reconnect to the app.
    this.client.on('disconnected', (eresult, msg) => {
      this._isLoggedIn = false;
      this._playingBlocked = false;
      const unansweredLogOff = eresult === 0 && msg === 'Logged off';
      this._reconnectPending = !this._manualLogOff && !unansweredLogOff;
      this._reconnectPendingSince = Date.now();
      this._manualLogOff = false;
    });

    // A persistent 'error' listener must always exist: steam-user can emit
    // 'error' at any time (e.g. during getOwnedGames, between login and
    // startIdling), and an 'error' event with no listener makes Node's
    // EventEmitter throw and crash the process. Forward to the app-level
    // handler once one is registered via onError.
    this.client.on('error', (err: Error) => {
      this._isLoggedIn = false;
      this._playingBlocked = false;
      this._reconnectPending = false;
      this._errorHandler?.(err);
    });

    // Tracked persistently because Steam reports a blocked session right after
    // logon, before the app has registered its own playingState handler.
    this.client.on('playingState', (blocked: boolean) => {
      this._playingBlocked = blocked;
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

  // True while steam-user is reconnecting on its own; logOn must not be called.
  get isReconnecting(): boolean {
    if (this.isConnected || !this._reconnectPending) return false;
    return Date.now() - this._reconnectPendingSince < RECONNECT_PENDING_MAX_MS;
  }

  // True while steam-user has a logon attempt in flight (its own or ours). This
  // is the flag logOn() itself checks before throwing, so it is authoritative
  // where isReconnecting is only a heuristic derived from events.
  get isConnecting(): boolean {
    return this.client._connecting === true;
  }

  // Tears down a logon attempt steam-user is stuck in. With no session held,
  // logOff() is synchronous and silent: it ends the socket, clears _connecting
  // and cancels steam-user's retry timers, so the next logOn starts clean.
  // Deliberately not logout(): that would flag a manual logoff for an event
  // that never comes.
  abortPendingConnect(): void {
    if (this.isConnected) return;
    this.client.logOff();
    this._reconnectPending = false;
  }

  // True while another session on this account is playing, which blocks this
  // session's gamesPlayed entirely.
  get isPlayingBlocked(): boolean {
    return this._playingBlocked;
  }

  get accountName(): string | null {
    return this._accountName;
  }

  // False if getOwnedGames had to give up waiting for license data, so
  // family-shared games may be missing from the library.
  get ownershipCacheComplete(): boolean {
    return this._ownershipCacheComplete;
  }

  // The refresh token the live session runs on (renewed in place)
  get currentRefreshToken(): string | null {
    return this._refreshToken;
  }

  // Asks Steam for a renewed refresh token once per logon, the same cadence the
  // official client and steam-user's renewRefreshTokens use. Steam only issues
  // one when the current token is close to expiry; the old token is invalid
  // from then on, so the handler must persist the new one. The request must go
  // over the CM connection (steam-user's own session factory); the Web API
  // transport that steam-session uses by default answers AccessDenied.
  private async renewRefreshToken(): Promise<void> {
    if (!this._refreshToken) return;
    const session =
      this.client._getLoginSession?.() ?? new LoginSession(EAuthTokenPlatformType.SteamClient);
    session.refreshToken = this._refreshToken;
    try {
      const renewed = await session.renewRefreshToken();
      if (renewed && session.refreshToken) {
        this._refreshToken = session.refreshToken;
        // steam-user's own reconnects (auto-relogin, relog()) reuse its saved
        // logon details; without this every flush relog would present the
        // now-invalid old token.
        if (this.client._logOnDetails) this.client._logOnDetails.access_token = session.refreshToken;
        this._refreshTokenHandler?.(session.refreshToken);
      }
    } catch (err) {
      console.error(`Refresh token renewal failed: ${(err as Error).message}`);
    }
  }

  get steamUser(): SteamUser {
    return this.client;
  }

  // Logs in to Steam using a saved refresh token. Rejects (instead of letting
  // steam-user throw uncatchably inside process.nextTick) when a session or a
  // logon attempt already exists, and times out an attempt steam-user abandons.
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
        // Persona is set Online by the persistent constructor 'loggedOn' listener.
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

  // Resolves once steam-user has populated the PICS ownership cache; false if
  // the timeout hit first (large libraries), in which case family-shared and
  // free/paid tagging is incomplete.
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

  // Returns appids belonging to family-shared (non-owned) licenses
  private async getSharedAppIds(ownAccountId: number): Promise<Set<number>> {
    const cached = await this.waitForOwnershipCache();
    this._ownershipCacheComplete = cached;
    if (!cached) {
      console.error(
        'License data did not arrive in time — family-shared games may be missing and free/paid tags may be off. Restart to retry.'
      );
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

    if (appIds.length > MAX_IDLE_GAMES) {
      throw new Error(`Cannot idle more than ${MAX_IDLE_GAMES} games at once`);
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
      this._manualLogOff = true;
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
    this._manualLogOff = true;
    this.client.logOff();
    this._isLoggedIn = false;
    this._accountName = null;
  }

  // Registers a callback for disconnect events
  onDisconnected(callback: (eresult: number, msg: string) => void): void {
    this.client.on('disconnected', callback);
  }

  // Registers the callback for a renewed refresh token. The token used to log
  // on becomes invalid once this fires, so it must be saved.
  onRefreshToken(callback: (refreshToken: string) => void): void {
    this._refreshTokenHandler = callback;
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
