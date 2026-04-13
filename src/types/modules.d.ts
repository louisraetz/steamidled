declare module 'qrcode-terminal' {
  interface Options {
    small?: boolean;
  }

  export function generate(text: string, options?: Options, callback?: (qrcode: string) => void): void;
  export function generate(text: string, callback?: (qrcode: string) => void): void;
}

declare module 'steam-user' {
  import { EventEmitter } from 'events';
  import SteamID from 'steamid';

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

    static EPersonaState: typeof EPersonaState;

    logOn(details: LogOnDetails): void;
    logOff(): void;
    gamesPlayed(apps: number[] | { game_id: number }[]): void;
    getUserOwnedApps(steamId: SteamID): Promise<OwnedAppsResponse>;
    setPersona(state: EPersonaState, name?: string): void;
  }

  export = SteamUser;
}
