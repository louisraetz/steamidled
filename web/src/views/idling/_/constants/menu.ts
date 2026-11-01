import { COOLDOWN_HOURS, IDLE_HOURS } from '@/lib/settings';
import type { DurationUnit, ScheduleDialogCopy, ScheduleDialogMode } from '../types/schedule-dialog';

export const COOLDOWN_PRESETS = [
  { label: '6 hours', hours: 6 },
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
] as const;

export const EXEMPT_REASON = 'Turn off No cooldown first';
export const SCHEDULE_OFF_REASON = 'Random cooldowns are off in Settings';
export const PAUSED_REASON = 'Paused while you play it elsewhere';

export const UNIT_HOURS: Record<DurationUnit, number> = { hours: 1, days: 24 };

export const UNIT_OPTIONS: readonly { value: DurationUnit; label: string }[] = [
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
];

export const DEFAULT_COOLDOWN_HOURS = 12;

export const SCHEDULE_DIALOG_COPY: Record<ScheduleDialogMode, ScheduleDialogCopy> = {
  'cooldown-now': {
    title: (name) => `Cool down ${name}`,
    description: () => 'The game rests for this long, then collects again.',
    maxHours: COOLDOWN_HOURS.max,
  },
  'next-cooldown': {
    title: (name) => `Next cooldown for ${name}`,
    description: () => 'The next cooldown starts after this much more idling.',
    maxHours: IDLE_HOURS.max,
  },
  'cooldown-remaining': {
    title: () => 'Change remaining cooldown',
    description: (name) => `${name} collects again after this long.`,
    maxHours: COOLDOWN_HOURS.max,
  },
};
