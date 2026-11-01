import { formatClock, formatDay } from '@/lib/format';

export function libraryUpdatedText(updatedAt: number | null, now: number): string {
  if (updatedAt === null) return 'Not loaded yet';
  const sameDay = formatDay(updatedAt) === formatDay(now);
  const day = sameDay ? 'today' : formatDay(updatedAt);
  return `Updated ${day} at ${formatClock(updatedAt)}`;
}
