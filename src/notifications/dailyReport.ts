import type { IdlingGame } from '../types/index.js';
import { pad2 } from '../utils/format.js';

export function formatDailyReport(
  idling: IdlingGame[],
  paused: IdlingGame[],
  cooling: IdlingGame[],
  dayStartAccumulatedMs: Map<number, number>,
  periodLabel: string,
  isFrozen = false,
  nowMs = Date.now()
): string {
  const now = nowMs;
  const lines: string[] = [];
  lines.push(`📊 Daily idling report — ${periodLabel}`);

  const all = [...idling, ...paused, ...cooling];
  const exempt = all.find((g) => g.nextPauseAtMs === null);

  const todayGain = (game: IdlingGame, accumulated: number): string =>
    formatHM(accumulated - (dayStartAccumulatedMs.get(game.appid) ?? 0));

  if (idling.length > 0) {
    lines.push('');
    lines.push(`Idling (${idling.length})${isFrozen ? ' — currently paused' : ''}:`);
    for (const game of idling) {
      const liveAccumulated = isFrozen
        ? game.accumulatedMs
        : game.accumulatedMs + (now - game.startTime.getTime());
      const totalMinutes = game.initialPlaytime + Math.floor(liveAccumulated / 60000);
      lines.push(
        `• ${game.name} — +${todayGain(game, liveAccumulated)} today, ${formatTotalH(totalMinutes)} total`
      );
    }
  }

  if (cooling.length > 0) {
    lines.push('');
    lines.push(`Cooldown (${cooling.length}):`);
    for (const game of cooling) {
      const remaining = game.pauseUntil ? game.pauseUntil.getTime() - now : 0;
      lines.push(
        `• ${game.name} — +${todayGain(game, game.accumulatedMs)} today, resumes in ${formatRemaining(remaining)}`
      );
    }
  }

  if (paused.length > 0) {
    lines.push('');
    lines.push(`User-paused (${paused.length}):`);
    for (const game of paused) {
      lines.push(`• ${game.name}`);
    }
  }

  if (exempt) {
    lines.push('');
    lines.push(`Exempt: ${exempt.name} ∞`);
  }

  return lines.join('\n');
}

function formatHM(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatTotalH(totalMinutes: number): string {
  return `${Math.floor(totalMinutes / 60).toLocaleString()}h`;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'now';
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes >= 24 * 60) return `${Math.floor(totalMinutes / (24 * 60))}d`;
  if (totalMinutes >= 60) return `${Math.floor(totalMinutes / 60)}h`;
  return `${totalMinutes}m`;
}

export function dayBefore(time: number): Date {
  const date = new Date(time);
  date.setDate(date.getDate() - 1);
  return date;
}

export function formatReportTime(date: Date): string {
  return `${date.toLocaleDateString('en-CA')} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function reportPeriodLabel(windowStart: Date, reportHour: number): string {
  if (reportHour === 0) return windowStart.toLocaleDateString('en-CA');
  return `since ${formatReportTime(windowStart)}`;
}
