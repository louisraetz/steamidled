import type { ScheduleResult } from '../core/schedule.js';
import type { FlushNowResult, RetryNowResult } from '../core/session-controls.js';
import type { SteamClient } from '../steam/client.js';
import type { TelegramNotifier } from '../notifications/telegram.js';
import type { Settings, SettingsPatch } from '../settings/schema.js';
import type { SettingsUpdate } from '../storage/settings.js';
import type { IdlingGame, SteamGame } from '../types/index.js';
import type { LoginFlowState, Phase, TelegramSnapshot } from './types.js';

export type ResumeKind = 'reconnecting' | 'taken-over' | 'rate-limited';

export interface ResumeInfo {
  kind: ResumeKind;
  since: number;
  nextRetryAt: number | null;
  attempt: number;
}

export interface EngineState {
  sessionLive: boolean;
  accountName: string;
  libraryLoaded: boolean;
  allGames: SteamGame[];
  gamesById: Map<number, SteamGame>;
  favorites: number[];
  exemptAppId: number | null;
  idlingGames: IdlingGame[];
  pausedGames: IdlingGame[];
  pausingGames: IdlingGame[];
  startTime: Date | null;
  isWaitingForResume: boolean;
  selfInitiatedRelog: boolean;
  playingBlocked: boolean;
  playingBlockedSince: number;
  resumeInfo: ResumeInfo | null;
  libraryVersion: number;
  libraryRefreshing: boolean;
  libraryUpdatedAt: number | null;
  dayStartedAt: number | null;
  dayStartAccumulatedMs: ReadonlyMap<number, number>;
  settings: Settings;
}

export type SessionStart = 'resumed' | 'fresh';


export interface Engine {
  readonly client: SteamClient;
  readonly telegram: TelegramNotifier;
  readonly version: string;
  readonly startedAt: number;
  state(): EngineState;
  loginRetryDelay(rateLimited: boolean, attempt: number): number;
  storedFavorites(): number[];
  beginSession(accountName: string): SessionStart;
  loadLibrary(): Promise<number | null>;
  startFavorites(): number;
  startRestoredOrFavorites(): void;
  applySelection(appIds: number[]): void;
  stop(): void;
  setExempt(appId: number | null): boolean;
  setFavorite(appId: number, favorite: boolean): boolean;
  logout(): void;
  retryResume(): void;
  retryNow(): RetryNowResult;
  flushNow(): FlushNowResult;
  refreshLibrary(): boolean;
  updateSettings(patch: SettingsPatch): SettingsUpdate;
  coolDownNow(appId: number, hours: number | null): ScheduleResult;
  endCooldownNow(appId: number): ScheduleResult;
  setNextCooldownIn(appId: number, hours: number): ScheduleResult;
  setCooldownRemaining(appId: number, hours: number): ScheduleResult;
  rerollSchedules(): number;
  endAllCooldowns(): number;
  dailyReport(): string;
}

export interface WebBridge {
  changed(): void;
  sessionInvalid(signedOut: boolean): void;
  sessionFatal(error: { message: string; hint: string }): void;
  stop(): void;
}

export type ControllerPhase = Exclude<Phase, 'ready' | 'idling'> | 'active';

export interface ControllerState {
  phase: ControllerPhase;
  loginError: { title: string; message: string } | null;
  error: { message: string; hint: string } | null;
  login: LoginFlowState | null;
  telegram: TelegramSnapshot;
  nextRetryAt: number | null;
  storedFavorites: number[];
}
