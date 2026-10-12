declare module 'qrcode-terminal' {
  interface Options {
    small?: boolean;
  }

  export function generate(text: string, options?: Options, callback?: (qrcode: string) => void): void;
  export function generate(text: string, callback?: (qrcode: string) => void): void;
}

declare module 'steam-user' {
  import { EventEmitter } from 'events';

  // Minimal local shape of the `steamid` package's SteamID (not a direct
  // dependency, so its types do not resolve here; an unresolved import would
  // silently become `any` under skipLibCheck).
  interface SteamID {
    accountid: number;
    type: number;
    universe: number;
    instance: number;
    getSteamID64(): string;
    toString(): string;
  }

  interface SteamUserOptions {
    enablePicsCache?: boolean;
    renewRefreshTokens?: boolean;
  }

  interface LogOnDetails {
    accountName?: string;
    password?: string;
    refreshToken?: string;
    rememberPassword?: boolean;
    machineName?: string;
  }

  interface OwnedApp {
    appid: number;
    name?: string;
    playtime_forever?: number;
  }

  interface OwnedAppsResponse {
    apps: OwnedApp[];
  }

  interface SteamUserEvents {
    loggedOn: (details: unknown, parental: unknown) => void;
    disconnected: (eresult: number, msg: string) => void;
    error: (err: Error & { eresult?: number }) => void;
    playingState: (blocked: boolean, playingApp: number) => void;
    refreshToken: (refreshToken: string) => void;
    ownershipCached: () => void;
  }

  interface OwnedAppsOptions {
    includePlayedFreeGames?: boolean;
    filterAppids?: number[];
    includeFreeSub?: boolean;
    includeAppInfo?: boolean;
    skipUnvettedApps?: boolean;
  }

  interface License {
    package_id: number;
    owner_id: number;
    flags: number;
    access_token?: number;
  }

  interface PackageInfo {
    appids?: number[];
  }

  interface PicsPackageEntry {
    packageinfo?: PackageInfo | null;
  }

  interface PicsCache {
    apps?: Record<number, unknown>;
    packages?: Record<number, PicsPackageEntry>;
  }

  enum EPersonaState {
    Offline = 0,
    Online = 1,
    Busy = 2,
    Away = 3,
    Snooze = 4,
    LookingToTrade = 5,
    LookingToPlay = 6,
    Invisible = 7,
  }

  class SteamUser extends EventEmitter {
    steamID: SteamID | null;
    licenses?: License[];
    picsCache: PicsCache;
    playingState?: { blocked: boolean; appid: number };
    // Private steam-user flag (components/09-logon.js): true from logOn() until
    // a logon response or a cleaned-up connection close. logOn() throws
    // uncatchably while it is set, and some internal retry loops hold it
    // without ever emitting an event, so the app has to read it.
    _connecting?: boolean;
    // Private steam-user logon details reused by its own reconnects; a renewed
    // refresh token must be written here or those reconnects use the old one.
    _logOnDetails?: { access_token?: string };
    // Private factory for a steam-session LoginSession that talks over the CM
    // connection. Steam only renews SteamClient refresh tokens over the CM; the
    // Web API answers AccessDenied.
    _getLoginSession?(): import('steam-session').LoginSession;

    static EPersonaState: typeof EPersonaState;
    // Bi-directional enum; we use the numeric→name direction for error labels.
    static EResult: Record<number, string>;

    constructor(options?: SteamUserOptions);

    on<K extends keyof SteamUserEvents>(event: K, listener: SteamUserEvents[K]): this;
    once<K extends keyof SteamUserEvents>(event: K, listener: SteamUserEvents[K]): this;
    removeListener<K extends keyof SteamUserEvents>(event: K, listener: SteamUserEvents[K]): this;

    logOn(details: LogOnDetails): void;
    logOff(): void;
    relog(): void;
    gamesPlayed(apps: number[] | { game_id: number }[]): void;
    getUserOwnedApps(steamId: SteamID, options?: OwnedAppsOptions): Promise<OwnedAppsResponse>;
    setPersona(state: EPersonaState, name?: string): void;
  }

  export = SteamUser;
}
