import type { IdlingGame } from '../types/index.js';

export interface ScheduleAccess {
  idling(): IdlingGame[];
  setIdling(games: IdlingGame[]): void;
  pausing(): IdlingGame[];
  setPausing(games: IdlingGame[]): void;
  paused(): IdlingGame[];
  isFrozen(): boolean;
  bank(): void;
  hoursMs: number;
  randomIdlePhaseMs(): number;
  randomCooldownMs(): number;
  setGamesPlaying(appIds: number[]): void;
  stateChanged(): void;
  log(message: string): void;
}

export type ScheduleRejection = 'not-in-session' | 'paused' | 'exempt' | 'not-collecting' | 'not-cooling';

export type ScheduleResult = { ok: true } | { ok: false; reason: ScheduleRejection };

type Location = 'idling' | 'pausing' | 'paused';

const OK: ScheduleResult = { ok: true };

function reject(reason: ScheduleRejection): ScheduleResult {
  return { ok: false, reason };
}

function formatHours(hours: number): string {
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24}d`;
  return `${hours}h`;
}

export function createSchedule(access: ScheduleAccess) {
  const toMs = (hours: number): number => hours * access.hoursMs;
  const toHours = (ms: number): number => Math.max(1, Math.round(ms / access.hoursMs));

  function locate(appid: number): { game: IdlingGame; where: Location } | null {
    const lists: [Location, IdlingGame[]][] = [
      ['idling', access.idling()],
      ['pausing', access.pausing()],
      ['paused', access.paused()],
    ];
    for (const [where, games] of lists) {
      const game = games.find((entry) => entry.appid === appid);
      if (game) return { game, where };
    }
    return null;
  }

  function liveAccumulated(game: IdlingGame, now: number): number {
    if (access.isFrozen()) return game.accumulatedMs;
    return game.accumulatedMs + (now - game.startTime.getTime());
  }

  function syncPlaying(): void {
    if (!access.isFrozen()) access.setGamesPlaying(access.idling().map((game) => game.appid));
  }

  function commit(message: string, idlingChanged: boolean): ScheduleResult {
    if (idlingChanged) syncPlaying();
    access.log(message);
    access.stateChanged();
    return OK;
  }

  function freshIdlePhase(game: IdlingGame): void {
    if (game.nextPauseAtMs !== null) game.nextPauseAtMs = game.accumulatedMs + access.randomIdlePhaseMs();
  }

  function resumeCooling(games: IdlingGame[], now: Date): void {
    for (const game of games) {
      game.pauseUntil = null;
      game.startTime = now;
      freshIdlePhase(game);
    }
    access.setPausing(access.pausing().filter((game) => !games.includes(game)));
    access.setIdling([...access.idling(), ...games]);
  }

  function requireCollecting(appid: number): { game: IdlingGame } | ScheduleResult {
    const found = locate(appid);
    if (!found) return reject('not-in-session');
    if (found.where === 'paused') return reject('paused');
    if (found.where === 'pausing') return reject('not-collecting');
    if (found.game.nextPauseAtMs === null) return reject('exempt');
    return { game: found.game };
  }

  function requireCooling(appid: number): { game: IdlingGame } | ScheduleResult {
    const found = locate(appid);
    if (!found) return reject('not-in-session');
    if (found.where === 'paused') return reject('paused');
    if (found.where === 'idling') return reject('not-cooling');
    return { game: found.game };
  }

  function coolDownNow(appid: number, hours: number | null): ScheduleResult {
    const found = requireCollecting(appid);
    if (!('game' in found)) return found;
    const { game } = found;
    const cooldownMs = hours === null ? access.randomCooldownMs() : toMs(hours);
    access.bank();
    game.pauseUntil = new Date(Date.now() + cooldownMs);
    access.setIdling(access.idling().filter((entry) => entry !== game));
    access.setPausing([...access.pausing(), game]);
    return commit(`${game.name} cools down now for ${formatHours(toHours(cooldownMs))}`, true);
  }

  function endCooldownNow(appid: number): ScheduleResult {
    const found = requireCooling(appid);
    if (!('game' in found)) return found;
    resumeCooling([found.game], new Date());
    return commit(`Cooldown ended early for ${found.game.name}, it collects again`, true);
  }

  function setNextCooldownIn(appid: number, hours: number): ScheduleResult {
    const found = requireCollecting(appid);
    if (!('game' in found)) return found;
    const { game } = found;
    game.nextPauseAtMs = liveAccumulated(game, Date.now()) + toMs(hours);
    return commit(`Next cooldown for ${game.name} starts in ${formatHours(hours)} of idling`, false);
  }

  function setCooldownRemaining(appid: number, hours: number): ScheduleResult {
    const found = requireCooling(appid);
    if (!('game' in found)) return found;
    found.game.pauseUntil = new Date(Date.now() + toMs(hours));
    return commit(`Cooldown for ${found.game.name} now ends in ${formatHours(hours)}`, false);
  }

  function rerollIdlePhases(): number {
    const now = Date.now();
    const games = access.idling().filter((game) => game.nextPauseAtMs !== null);
    for (const game of games) game.nextPauseAtMs = liveAccumulated(game, now) + access.randomIdlePhaseMs();
    return games.length;
  }

  function rerollSchedules(): number {
    const collecting = rerollIdlePhases();
    const now = Date.now();
    const cooling = access.pausing();
    for (const game of cooling) game.pauseUntil = new Date(now + access.randomCooldownMs());
    const total = collecting + cooling.length;
    commit(`New random schedule for ${total} ${total === 1 ? 'game' : 'games'}`, false);
    return total;
  }

  function endAllCooldowns(): number {
    const cooling = [...access.pausing()];
    resumeCooling(cooling, new Date());
    commit(`Ended ${cooling.length} ${cooling.length === 1 ? 'cooldown' : 'cooldowns'}, every game collects again`, cooling.length > 0);
    return cooling.length;
  }

  return {
    coolDownNow,
    endCooldownNow,
    setNextCooldownIn,
    setCooldownRemaining,
    rerollIdlePhases,
    rerollSchedules,
    endAllCooldowns,
  };
}

export type Schedule = ReturnType<typeof createSchedule>;
