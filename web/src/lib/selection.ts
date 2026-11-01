import { MAX_IDLE_GAMES, MINUTE_MS } from '@/lib/constants';
import type { DaemonSnapshot, IdlingGameSnapshot, LibraryGame, Phase } from '@/lib/types';
import type { PlaceholderSources } from '@/types/placeholder-sources';
import type { SelectionIntent } from '@/types/selection-intent';
import type { SelectionLock } from '@/types/selection-lock';

export function selectionOf(snapshot: DaemonSnapshot): number[] {
  return snapshot.games.map((game) => game.appid);
}

export function selectionLock(snapshot: DaemonSnapshot): SelectionLock | null {
  if (snapshot.phase !== 'ready' && snapshot.phase !== 'idling') return 'stopped';
  if (snapshot.connection.state !== 'connected') return 'steam';
  return null;
}

export function sameSelection(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const other = new Set(b);
  return a.every((appid) => other.has(appid));
}

export function withGame(appIds: readonly number[], appid: number): number[] {
  if (appIds.includes(appid) || appIds.length >= MAX_IDLE_GAMES) return [...appIds];
  return [...appIds, appid];
}

export function withoutGame(appIds: readonly number[], appid: number): number[] {
  return appIds.filter((entry) => entry !== appid);
}

export function applyIntents(base: readonly number[], intents: ReadonlyMap<number, SelectionIntent>): number[] {
  const kept = base.filter((appid) => intents.get(appid)?.wanted !== false);
  const additions = [...intents.entries()]
    .filter(([appid, intent]) => intent.wanted && !kept.includes(appid))
    .sort((a, b) => a[1].version - b[1].version)
    .map(([appid]) => appid);
  return [...kept, ...additions].slice(0, MAX_IDLE_GAMES);
}

function fromLibrary(game: LibraryGame, exemptAppId: number | null): IdlingGameSnapshot {
  return {
    appid: game.appid,
    name: game.name,
    source: game.source,
    exempt: game.appid === exemptAppId,
    status: 'idling',
    totalMs: game.playtimeMinutes === null ? null : game.playtimeMinutes * MINUTE_MS,
    gainedMs: 0,
    counting: false,
    cooldownUntil: null,
    cooldownAt: null,
    todayGainedMs: 0,
  };
}

function fromKnown(game: IdlingGameSnapshot, exemptAppId: number | null): IdlingGameSnapshot {
  return {
    ...game,
    exempt: game.appid === exemptAppId,
    status: 'idling',
    gainedMs: 0,
    counting: false,
    cooldownUntil: null,
    cooldownAt: null,
    todayGainedMs: 0,
  };
}

function placeholderFor(appid: number, sources: PlaceholderSources, exemptAppId: number | null): IdlingGameSnapshot[] {
  const known = sources.known.get(appid);
  if (known) return [fromKnown(known, exemptAppId)];
  const game = sources.library.find((entry) => entry.appid === appid);
  return game ? [fromLibrary(game, exemptAppId)] : [];
}

function sessionPhase(phase: Phase, gameCount: number): Phase {
  if (phase !== 'ready' && phase !== 'idling') return phase;
  return gameCount > 0 ? 'idling' : 'ready';
}

export function withSelection(
  snapshot: DaemonSnapshot,
  appIds: readonly number[],
  sources: PlaceholderSources
): DaemonSnapshot {
  const wanted = new Set(appIds);
  const kept = snapshot.games.filter((game) => wanted.has(game.appid));
  const present = new Set(kept.map((game) => game.appid));
  const added = appIds
    .filter((appid) => !present.has(appid))
    .flatMap((appid) => placeholderFor(appid, sources, snapshot.exemptAppId));
  const games = [...kept, ...added];
  return { ...snapshot, phase: sessionPhase(snapshot.phase, games.length), games };
}
