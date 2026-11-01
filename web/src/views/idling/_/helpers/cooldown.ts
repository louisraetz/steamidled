import type { DaemonSnapshot } from '@/lib/types';

export function allCoolingDown(snapshot: DaemonSnapshot): boolean {
  return snapshot.games.length > 0 && snapshot.games.every((game) => game.status === 'cooldown');
}

export function nextIdleAt(snapshot: DaemonSnapshot): number | null {
  const times = snapshot.games.flatMap((game) => (game.cooldownUntil === null ? [] : [game.cooldownUntil]));
  return times.length === 0 ? null : Math.min(...times);
}
