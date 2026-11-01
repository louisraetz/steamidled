import type { DaemonSnapshot, IdlingGameSnapshot } from '@/lib/types';

function sumGains(snapshot: DaemonSnapshot, now: number, gainOf: (game: IdlingGameSnapshot) => number): number {
  const elapsed = Math.max(0, now - snapshot.serverTime);
  return snapshot.games.reduce((sum, game) => sum + gainOf(game) + (game.counting ? elapsed : 0), 0);
}

export function sessionGainMs(snapshot: DaemonSnapshot, now: number): number {
  return sumGains(snapshot, now, (game) => game.gainedMs);
}

export function todayGainMs(snapshot: DaemonSnapshot, now: number): number | null {
  if (snapshot.todayStartedAt === null) return null;
  return sumGains(snapshot, now, (game) => game.todayGainedMs);
}

export function countingGames(snapshot: DaemonSnapshot): number {
  return snapshot.games.filter((game) => game.counting).length;
}
