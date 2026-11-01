import { connectionCopy } from '@/lib/connection-copy';
import { SHARED_TOTAL_TITLE } from '@/lib/constants';
import { formatPhase, formatSession, formatTotal } from '@/lib/format';
import type { Connection, DaemonSnapshot, IdlingGameSnapshot } from '@/lib/types';
import { STATUS_GROUP } from '../constants/groups';
import { SCHEDULE_OFF_NEXT } from '../constants/status';
import type { GameDisplay } from '../types/game-display';

function statusOf(
  game: IdlingGameSnapshot,
  connection: Connection,
  scheduleEnabled: boolean,
  now: number
): Pick<GameDisplay, 'status' | 'next'> {
  if (game.status === 'paused') return { status: 'paused', next: 'Playing elsewhere' };
  if (game.status === 'cooldown') {
    return { status: 'cooldown', next: `Idles again in ${formatPhase((game.cooldownUntil ?? now) - now)}` };
  }
  const frozen = connectionCopy(connection).frozenReason;
  if (frozen) return { status: 'paused', next: frozen };
  if (game.exempt) return { status: 'idling', next: 'No cooldown' };
  if (!scheduleEnabled) return { status: 'idling', next: SCHEDULE_OFF_NEXT };
  if (game.cooldownAt === null) return { status: 'idling', next: 'Starting' };
  return { status: 'idling', next: `Cooldown in ${formatPhase(game.cooldownAt - now)}` };
}

export function describeGame(game: IdlingGameSnapshot, snapshot: DaemonSnapshot, now: number): GameDisplay {
  const delta = game.counting ? Math.max(0, now - snapshot.serverTime) : 0;
  const status = statusOf(game, snapshot.connection, snapshot.settings.schedule.enabled, now);
  const today = formatSession(game.todayGainedMs + delta);
  return {
    appid: game.appid,
    name: game.name,
    ...status,
    scheduleStatus: game.status,
    exempt: game.exempt,
    cooldownAt: game.cooldownAt,
    cooldownUntil: game.cooldownUntil,
    nextDetail: `· ${status.next}`,
    total: game.totalMs === null ? '' : formatTotal(game.totalMs + delta),
    totalTitle: game.totalMs === null ? SHARED_TOTAL_TITLE : undefined,
    session: formatSession(game.gainedMs + delta),
    today,
    todayTitle: `${today} today`,
    dimmed: STATUS_GROUP[status.status].dimmed,
    counting: game.counting,
  };
}
