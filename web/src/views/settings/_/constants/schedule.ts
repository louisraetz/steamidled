import { HOURS_PER_DAY } from '@/lib/constants';
import { COOLDOWN_HOURS, DEFAULT_SCHEDULE_PROFILE, IDLE_HOURS, SCHEDULE_PROFILES } from '@/lib/settings';
import type { RangeDefinition, RangeKey } from '../types/schedule-form';

export const RANGE_BY_KEY: Record<RangeKey, RangeDefinition> = {
  idle: {
    key: 'idle',
    label: 'Idle phase',
    unit: 'days',
    unitSingular: 'day',
    hoursPerUnit: HOURS_PER_DAY,
    min: 1,
    max: IDLE_HOURS.max / HOURS_PER_DAY,
    fields: ['idleMinHours', 'idleMaxHours'],
  },
  cooldown: {
    key: 'cooldown',
    label: 'Cooldown',
    unit: 'hours',
    unitSingular: 'hour',
    hoursPerUnit: 1,
    min: COOLDOWN_HOURS.min,
    max: COOLDOWN_HOURS.max,
    fields: ['cooldownMinHours', 'cooldownMaxHours'],
  },
};

export const DEFAULT_RANGES = SCHEDULE_PROFILES[DEFAULT_SCHEDULE_PROFILE].ranges;

export const RANGES: RangeDefinition[] = [RANGE_BY_KEY.idle, RANGE_BY_KEY.cooldown];

export const SCHEDULE_OFF_SENTENCE = 'Games idle nonstop. Cooldowns that already started finish on their own.';
export const SCHEDULE_ACTIONS_NOTE =
  "New ranges apply from each game's next phase. Apply to current games picks new times for all of them now.";
export const NOTHING_IDLING_LINE = 'Nothing is idling. New ranges apply to games you add.';
export const IDLING_COUNTS = [
  { status: 'idling', label: 'collecting' },
  { status: 'cooldown', label: 'cooling down' },
  { status: 'paused', label: 'paused' },
] as const;
export const COOLDOWN_HINT = {
  title: 'Why random cooldowns?',
  footnote: 'The chart below shows the difference.',
};
