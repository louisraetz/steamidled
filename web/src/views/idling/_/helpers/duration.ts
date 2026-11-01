import { pluralize } from '@/lib/format';
import { DEFAULT_COOLDOWN_HOURS, UNIT_HOURS } from '../constants/menu';
import type { GameDisplay } from '../types/game-display';
import type { DurationValues, ScheduleDialogMode } from '../types/schedule-dialog';

const HOUR_MS = 3_600_000;
const DAY_HOURS = 24;

export function formatHoursLabel(hours: number): string {
  if (hours >= DAY_HOURS && hours % DAY_HOURS === 0) {
    const days = hours / DAY_HOURS;
    return `${days} ${pluralize(days, 'day')}`;
  }
  return `${hours} ${pluralize(hours, 'hour')}`;
}

export function durationHours(values: DurationValues): number {
  return values.amount * UNIT_HOURS[values.unit];
}

function fromHours(hours: number, maxHours: number): DurationValues {
  const clamped = Math.min(maxHours, Math.max(1, hours));
  if (clamped >= DAY_HOURS && clamped % DAY_HOURS === 0) return { amount: clamped / DAY_HOURS, unit: 'days' };
  return { amount: clamped, unit: 'hours' };
}

function hoursUntil(target: number | null, now: number): number {
  if (target === null) return DEFAULT_COOLDOWN_HOURS;
  return Math.round(Math.max(0, target - now) / HOUR_MS);
}

export function defaultDuration(mode: ScheduleDialogMode, game: GameDisplay, now: number, maxHours: number): DurationValues {
  if (mode === 'next-cooldown') return fromHours(hoursUntil(game.cooldownAt, now), maxHours);
  if (mode === 'cooldown-remaining') return fromHours(hoursUntil(game.cooldownUntil, now), maxHours);
  return fromHours(DEFAULT_COOLDOWN_HOURS, maxHours);
}
