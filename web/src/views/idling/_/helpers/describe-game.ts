import { connectionCopy } from '@/lib/connection-copy';
import { SHARED_TOTAL_TITLE } from '@/lib/constants';
import { formatPhase, formatSession, formatTotal } from '@/lib/format';
import type { Connection, IdlingGameSnapshot } from '@/lib/types';
import type { GameDisplay } from '../types/game-display';

function statusOf(
  game: IdlingGameSnapshot,
  connection: Connection,
  now: number
): Pick<GameDisplay, 'status' | 'next' | 'nextShort'> {
  if (game.status === 'paused') {
    return { status: 'paused', next: 'Playing elsewhere', nextShort: 'Playing elsewhere' };
  }
  if (game.status === 'cooldown') {
    const left = formatPhase((game.cooldownUntil ?? now) - now);
    return { status: 'cooldown', next: `Idles again in ${left}`, nextShort: left };
  }
  const frozen = connectionCopy(connection).frozenReason;
  if (frozen) return { status: 'paused', next: frozen, nextShort: frozen };
  if (game.exempt) return { status: 'exempt', next: 'No cooldown', nextShort: null };
  const left = formatPhase((game.cooldownAt ?? now) - now);
  return { status: 'idling', next: `Cooldown in ${left}`, nextShort: left };
}

export function describeGame(
  game: IdlingGameSnapshot,
  connection: Connection,
  serverTime: number,
  now: number
): GameDisplay {
  const delta = game.counting ? Math.max(0, now - serverTime) : 0;
  const status = statusOf(game, connection, now);
  return {
    appid: game.appid,
    name: game.name,
    ...status,
    statusDetail: status.nextShort ? `· ${status.nextShort}` : '',
    nextDetail: `· ${status.next}`,
    total: game.totalMs === null ? '' : formatTotal(game.totalMs + delta),
    totalTitle: game.totalMs === null ? SHARED_TOTAL_TITLE : undefined,
    session: formatSession(game.gainedMs + delta),
  };
}
