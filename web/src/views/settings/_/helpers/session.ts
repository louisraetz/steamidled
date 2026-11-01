import { mono, plain, type TextPart } from '@/lib/text-parts';
import type { DaemonSnapshot } from '@/lib/types';
import { IDLING_COUNTS, NOTHING_IDLING_LINE } from '../constants/schedule';

export function hasIdlingGames(snapshot: DaemonSnapshot): boolean {
  const session = snapshot.phase === 'ready' || snapshot.phase === 'idling';
  return session && snapshot.games.length > 0;
}

export function coolingCount(snapshot: DaemonSnapshot): number {
  return snapshot.games.filter((game) => game.status === 'cooldown').length;
}

export function canCommitPlaytime(snapshot: DaemonSnapshot): boolean {
  return snapshot.connection.state === 'connected' && snapshot.games.some((game) => game.status === 'idling');
}

export function idlingNowParts(snapshot: DaemonSnapshot): TextPart[] {
  if (!hasIdlingGames(snapshot)) return [plain(NOTHING_IDLING_LINE)];
  const counts = IDLING_COUNTS.map(({ status, label }) => ({
    label,
    count: snapshot.games.filter((game) => game.status === status).length,
  })).filter((entry) => entry.count > 0);
  return [
    ...counts.flatMap((entry, index) => [
      ...(index === 0 ? [] : [plain(', ')]),
      mono(String(entry.count)),
      plain(` ${entry.label}`),
    ]),
    plain('.'),
  ];
}
