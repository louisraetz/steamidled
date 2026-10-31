import type { IdlingGame } from '../types/index.js';
import type { ControllerState, EngineState } from './engine.js';
import type { Connection, DaemonSnapshot, GameStatus, IdlingGameSnapshot, Phase } from './types.js';

const MINUTE_MS = 60_000;

export interface SnapshotMeta {
  version: string;
  startedAt: number;
  now: number;
}

function sessionSize(engine: EngineState): number {
  return engine.idlingGames.length + engine.pausedGames.length + engine.pausingGames.length;
}

export function phaseOf(controller: ControllerState, engine: EngineState): Phase {
  if (controller.phase !== 'active') return controller.phase;
  return sessionSize(engine) > 0 ? 'idling' : 'ready';
}

function isFlushRelog(engine: EngineState): boolean {
  return engine.isWaitingForResume && engine.selfInitiatedRelog;
}

export function connectionOf(phase: Phase, engine: EngineState, now: number): Connection {
  if (phase !== 'ready' && phase !== 'idling' && phase !== 'loading-library') return { state: 'offline' };
  if (engine.isWaitingForResume && !engine.selfInitiatedRelog) {
    const resume = engine.resumeInfo;
    const since = resume?.since ?? now;
    const nextRetryAt = resume?.nextRetryAt ?? null;
    if (resume?.kind === 'taken-over') return { state: 'taken-over', since, nextRetryAt };
    if (resume?.kind === 'rate-limited') return { state: 'rate-limited', since, nextRetryAt };
    return { state: 'reconnecting', since, nextRetryAt, attempt: resume?.attempt ?? 1 };
  }
  if (engine.playingBlocked) return { state: 'blocked', since: engine.playingBlockedSince || now };
  return { state: 'connected' };
}

function gameSnapshot(
  game: IdlingGame,
  status: GameStatus,
  engine: EngineState,
  now: number
): IdlingGameSnapshot {
  const frozen = engine.playingBlocked || (engine.isWaitingForResume && !isFlushRelog(engine));
  const counting = status === 'idling' && !frozen;
  const live = status === 'idling' && !engine.playingBlocked && !engine.isWaitingForResume;
  const gainedMs = game.accumulatedMs + (live ? now - game.startTime.getTime() : 0);
  const source = engine.gamesById.get(game.appid)?.source ?? 'owned';
  const exempt = game.nextPauseAtMs === null;
  const cooldownAt =
    game.nextPauseAtMs === null || status === 'cooldown'
      ? null
      : now + Math.max(0, game.nextPauseAtMs - gainedMs);
  return {
    appid: game.appid,
    name: game.name,
    source,
    exempt,
    status,
    totalMs: source === 'shared' ? null : game.initialPlaytime * MINUTE_MS + gainedMs,
    gainedMs,
    counting,
    cooldownUntil: game.pauseUntil ? game.pauseUntil.getTime() : null,
    cooldownAt,
  };
}

export function buildSnapshot(
  controller: ControllerState,
  engine: EngineState,
  meta: SnapshotMeta
): DaemonSnapshot {
  const phase = phaseOf(controller, engine);
  const games = [
    ...engine.idlingGames.map((game) => gameSnapshot(game, 'idling', engine, meta.now)),
    ...engine.pausedGames.map((game) => gameSnapshot(game, 'paused', engine, meta.now)),
    ...engine.pausingGames.map((game) => gameSnapshot(game, 'cooldown', engine, meta.now)),
  ];
  return {
    serverTime: meta.now,
    version: meta.version,
    phase,
    connection: connectionOf(phase, engine, meta.now),
    accountName: engine.accountName || null,
    startedAt: meta.startedAt,
    idlingSince: engine.startTime ? engine.startTime.getTime() : null,
    favorites: engine.libraryLoaded ? [...engine.favorites] : [...controller.storedFavorites],
    favoritesInLibrary: engine.favorites.filter((appid) => engine.gamesById.has(appid)).length,
    exemptAppId: engine.exemptAppId,
    libraryLoaded: engine.libraryLoaded,
    games,
    nextRetryAt: controller.nextRetryAt,
    loginError: controller.loginError,
    error: controller.error,
    login: controller.login,
    telegram: controller.telegram,
  };
}
