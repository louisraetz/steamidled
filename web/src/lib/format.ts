const MINUTE_MS = 60_000;
const HOUR_MINUTES = 60;
const DAY_MINUTES = 24 * HOUR_MINUTES;

const countFormat = new Intl.NumberFormat('en-US');
const clockFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const logClockFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export function formatCount(value: number): string {
  return countFormat.format(value);
}

export function formatPlaytimeMinutes(minutes: number): string {
  if (minutes < HOUR_MINUTES) return `${minutes}m`;
  return `${formatCount(Math.floor(minutes / HOUR_MINUTES))}h`;
}

export function formatTotal(ms: number): string {
  return formatPlaytimeMinutes(Math.max(0, Math.floor(ms / MINUTE_MS)));
}

export function formatSession(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / MINUTE_MS));
  const hours = Math.floor(minutes / HOUR_MINUTES);
  if (hours === 0) return `+${minutes}m`;
  return `+${hours}h ${minutes % HOUR_MINUTES}m`;
}

export function formatPhase(ms: number): string {
  if (ms < MINUTE_MS) return '<1m';
  const minutes = Math.floor(ms / MINUTE_MS);
  const days = Math.floor(minutes / DAY_MINUTES);
  const hours = Math.floor((minutes % DAY_MINUTES) / HOUR_MINUTES);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % HOUR_MINUTES}m`;
  return `${minutes}m`;
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  return `${minutes}:${seconds}`;
}

export function formatClock(time: number): string {
  return clockFormat.format(time);
}

export function formatLogClock(time: number): string {
  return logClockFormat.format(time);
}

export function formatDay(time: number): string {
  return dayFormat.format(time);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
