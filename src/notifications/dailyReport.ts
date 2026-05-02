import type { IdlingGame } from '../types/index.js';

// Builds the daily Telegram report. Pure formatter — no side effects.
export function formatDailyReport(
  idling: IdlingGame[],
  paused: IdlingGame[],
  cooling: IdlingGame[],
  dayStartAccumulatedMs: Map<number, number>,
  date: Date,
  isWaiting = false
): string {
  const now = date.getTime();
  const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const lines: string[] = [];
  lines.push(`📊 Daily idling report — ${dateStr}`);

  const all = [...idling, ...paused, ...cooling];
  const exempt = all.find((g) => g.nextPauseAtMs === null);

  if (idling.length > 0) {
    lines.push('');
    lines.push(`Idling (${idling.length}):`);
    for (const game of idling) {
      const liveAccumulated = isWaiting
        ? game.accumulatedMs
        : game.accumulatedMs + (now - game.startTime.getTime());
      const todayMs = liveAccumulated - (dayStartAccumulatedMs.get(game.appid) ?? 0);
      const totalMinutes = game.initialPlaytime + Math.floor(liveAccumulated / 60000);
      lines.push(`• ${game.name} — +${formatHM(todayMs)} today, ${formatTotalH(totalMinutes)} total`);
    }
  }

  if (cooling.length > 0) {
    lines.push('');
    lines.push(`Cooldown (${cooling.length}):`);
    for (const game of cooling) {
      const remaining = game.pauseUntil ? game.pauseUntil.getTime() - now : 0;
      lines.push(`• ${game.name} — resumes in ${formatRemaining(remaining)}`);
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
