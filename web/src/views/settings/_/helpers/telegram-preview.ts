import { formatCount, formatHourOfDay, formatSession } from '@/lib/format';
import type { DaemonSnapshot, IdlingGameSnapshot, TelegramNotifyPrefs } from '@/lib/types';
import { NOTIFY_OPTIONS } from '../constants/notifications';
import {
  EMPTY_SESSION_GAMES,
  HOUR_MS,
  MESSAGE_SEPARATOR,
  MESSAGES,
  REPORT_GAME_LINES,
  ZOMBIE_META,
} from '../constants/telegram-preview';
import type { ChatBubbleModel, TelegramPreviewModel } from '../types/chat-bubble';

function message(head: string, detail: string): string {
  return `${head}${MESSAGE_SEPARATOR}${detail}`;
}

function bubble(key: string, text: string, meta: string | null = null): ChatBubbleModel {
  return { key, text, meta };
}

function sessionGames(snapshot: DaemonSnapshot): number {
  return snapshot.games.filter((game) => game.status === 'idling').length || EMPTY_SESSION_GAMES;
}

function exemptSuffix(snapshot: DaemonSnapshot): string {
  const exempt = snapshot.games.find((game) => game.appid === snapshot.exemptAppId);
  return exempt ? ` (exempt: ${exempt.name})` : '';
}

function startedBubble(snapshot: DaemonSnapshot): ChatBubbleModel {
  return bubble('started', message(MESSAGES.started, `${sessionGames(snapshot)} games${exemptSuffix(snapshot)}`));
}

function stoppedBubble(): ChatBubbleModel {
  return bubble('stopped', message(MESSAGES.stopped, MESSAGES.stoppedDetail));
}

function reportWindowStart(hour: number, now: number): Date {
  const start = new Date(now);
  start.setHours(hour, 0, 0, 0);
  if (start.getTime() > now) start.setDate(start.getDate() - 1);
  return start;
}

function reportLabel(hour: number, now: number): string {
  const date = reportWindowStart(hour, now).toLocaleDateString('en-CA');
  if (hour === 0) return date;
  return `since ${date} ${formatHourOfDay(hour)}`;
}

function reportGameLine(game: IdlingGameSnapshot): string {
  const total = formatCount(Math.floor((game.totalMs ?? game.gainedMs) / HOUR_MS));
  return `• ${message(game.name, `${formatSession(game.todayGainedMs)} today, ${total}h total`)}`;
}

function reportBody(games: IdlingGameSnapshot[]): string[] {
  const idling = games.filter((game) => game.status === 'idling');
  if (idling.length === 0) return [];
  const top = [...idling].sort((a, b) => b.todayGainedMs - a.todayGainedMs).slice(0, REPORT_GAME_LINES);
  const more = idling.length > REPORT_GAME_LINES ? [MESSAGES.more] : [];
  return ['', `Idling (${idling.length}):`, ...top.map(reportGameLine), ...more];
}

function reportBubble(snapshot: DaemonSnapshot, now: number): ChatBubbleModel {
  const hour = snapshot.settings.dailyReportHour;
  const header = message(MESSAGES.report, reportLabel(hour, now));
  return bubble('dailyReport', [header, ...reportBody(snapshot.games)].join('\n'), formatHourOfDay(hour));
}

function bubblesByKind(snapshot: DaemonSnapshot, now: number): Record<keyof TelegramNotifyPrefs, ChatBubbleModel[]> {
  return {
    lifecycle: [startedBubble(snapshot)],
    pauseResume: [
      bubble('paused', message(MESSAGES.paused, MESSAGES.pausedReason)),
      bubble('resumed', message(MESSAGES.resumed, `${sessionGames(snapshot)} games`)),
    ],
    flush: [bubble('flush', message(MESSAGES.flush, MESSAGES.flushDetail), `every ${snapshot.settings.flushIntervalHours}h`)],
    zombie: [bubble('zombie', message(MESSAGES.zombie, MESSAGES.zombieDetail), ZOMBIE_META)],
    dailyReport: [reportBubble(snapshot, now)],
  };
}

export function telegramPreview(snapshot: DaemonSnapshot, now: number): TelegramPreviewModel {
  const byKind = bubblesByKind(snapshot, now);
  const prefs = snapshot.telegram.notify;
  return {
    bubbles: NOTIFY_OPTIONS.filter((option) => prefs[option.key]).flatMap((option) => byKind[option.key]),
    alwaysSent: stoppedBubble(),
  };
}

export function telegramTeaser(snapshot: DaemonSnapshot, now: number): ChatBubbleModel[] {
  return [startedBubble(snapshot), reportBubble(snapshot, now), stoppedBubble()];
}
