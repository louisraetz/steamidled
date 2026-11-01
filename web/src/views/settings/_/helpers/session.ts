import { canRetryNow } from '@/lib/connection-copy';
import type { DaemonSnapshot } from '@/lib/types';

export function hasSession(snapshot: DaemonSnapshot): boolean {
  return snapshot.phase === 'ready' || snapshot.phase === 'idling';
}

export function coolingCount(snapshot: DaemonSnapshot): number {
  return snapshot.games.filter((game) => game.status === 'cooldown').length;
}

export function canCommitPlaytime(snapshot: DaemonSnapshot): boolean {
  return snapshot.connection.state === 'connected' && snapshot.games.some((game) => game.status === 'idling');
}

export function canRetry(snapshot: DaemonSnapshot): boolean {
  return canRetryNow(snapshot.connection);
}
