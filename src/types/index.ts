export type GameSource = 'owned' | 'free' | 'shared';

export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
  source: GameSource;
}

export interface StoredCredentials {
  accountName: string;
  refreshToken: string;
  machineName?: string;
}

export interface LoginResult {
  success: boolean;
  accountName?: string;
  error?: string;
  eresult?: number;
}

export type AuthMethod = 'qr' | 'credentials';

export interface GameSelection {
  appid: number;
  name: string;
}

export interface IdlingGame {
  appid: number;
  name: string;
  initialPlaytime: number;
  startTime: Date;
  accumulatedMs: number;
  nextPauseAtMs: number | null;
  pauseUntil: Date | null;
}

export interface GameSelectorResult {
  selectedGames: GameSelection[];
  exemptAppId: number | null;
  aborted?: boolean;
}
