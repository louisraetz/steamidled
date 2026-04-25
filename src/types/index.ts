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

export interface IdlingSession {
  games: SteamGame[];
  startTime: Date;
}

export interface LoginResult {
  success: boolean;
  accountName?: string;
  error?: string;
}

export type AuthMethod = 'qr' | 'credentials';

export interface GameSelection {
  appid: number;
  name: string;
}

export interface IdlingGame {
  appid: number;
  name: string;
  initialPlaytime: number;  // playtime_forever from Steam (in minutes)
  startTime: Date;          // when this game started idling
  accumulatedMs: number;    // accumulated idle time (for pause/resume)
  nextPauseAtMs: number | null;  // accumulatedMs threshold to enter cooldown; null = exempt
  pauseUntil: Date | null;       // when set, game is in randomizer cooldown
}

export interface GameSelectorResult {
  selectedGames: GameSelection[];
  quickStart: boolean;
  exemptAppId: number | null;
}
