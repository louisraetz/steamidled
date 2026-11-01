import type { Settings } from '../settings/schema.js';

export type Phase = 'needs-login' | 'signing-in' | 'loading-library' | 'ready' | 'idling' | 'error';

export type Connection =
  | { state: 'connected' }
  | { state: 'reconnecting'; since: number; nextRetryAt: number | null; attempt: number }
  | { state: 'taken-over'; since: number; nextRetryAt: number | null }
  | { state: 'rate-limited'; since: number; nextRetryAt: number | null }
  | { state: 'blocked'; since: number }
  | { state: 'offline' };

export type GameSource = 'owned' | 'free' | 'shared';

export type GameStatus = 'idling' | 'cooldown' | 'paused';

export interface IdlingGameSnapshot {
  appid: number;
  name: string;
  source: GameSource;
  exempt: boolean;
  status: GameStatus;
  totalMs: number | null;
  gainedMs: number;
  counting: boolean;
  cooldownUntil: number | null;
  cooldownAt: number | null;
  todayGainedMs: number;
}

export type GuardType = 'email-code' | 'device-code' | 'device-confirmation' | 'email-confirmation';

export type LoginFlowState =
  | { method: 'qr'; status: 'pending'; challengeUrl: string; expiresAt: number }
  | { method: 'qr'; status: 'scanned' }
  | { method: 'qr' | 'password'; status: 'expired' }
  | {
      method: 'password';
      status: 'guard';
      guard: GuardType;
      emailDomain: string | null;
      codeAllowed: boolean;
      triesLeft: number;
    }
  | { method: 'password'; status: 'authenticating' }
  | { method: 'qr' | 'password'; status: 'error'; message: string };

export type TelegramState = 'off' | 'awaiting-start' | 'connected';

export interface TelegramNotifyPrefs {
  lifecycle: boolean;
  pauseResume: boolean;
  flush: boolean;
  zombie: boolean;
  dailyReport: boolean;
}

export type TelegramNotifyKind = keyof TelegramNotifyPrefs | 'critical';

export interface TelegramSnapshot {
  state: TelegramState;
  botUsername: string | null;
  chatLabel: string | null;
  notify: TelegramNotifyPrefs;
}

export interface DaemonSnapshot {
  serverTime: number;
  version: string;
  phase: Phase;
  connection: Connection;
  accountName: string | null;
  startedAt: number;
  idlingSince: number | null;
  favorites: number[];
  favoritesInLibrary: number;
  exemptAppId: number | null;
  libraryLoaded: boolean;
  libraryVersion: number;
  libraryRefreshing: boolean;
  libraryUpdatedAt: number | null;
  todayStartedAt: number | null;
  settings: Settings;
  games: IdlingGameSnapshot[];
  nextRetryAt: number | null;
  loginError: { title: string; message: string } | null;
  error: { message: string; hint: string } | null;
  login: LoginFlowState | null;
  telegram: TelegramSnapshot;
}

export interface LibraryGame {
  appid: number;
  name: string;
  playtimeMinutes: number | null;
  source: GameSource;
}

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: number;
  time: number;
  level: LogLevel;
  scope: string;
  message: string;
  hint: string | null;
}

export interface ApiError {
  error: { message: string; hint: string | null };
}

export interface TelegramConfirmResult {
  status: 'pending' | 'connected';
}
