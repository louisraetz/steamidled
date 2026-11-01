import { COOLDOWN_HOURS, DEFAULT_SETTINGS, IDLE_HOURS } from '@/lib/settings';
import type { RangeDefinition, RangeKey } from '../types/schedule-form';

const HOURS_PER_DAY = 24;

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

export const DEFAULT_SCHEDULE = DEFAULT_SETTINGS.schedule;

export const RANGES: RangeDefinition[] = [RANGE_BY_KEY.idle, RANGE_BY_KEY.cooldown];

export const SCHEDULE_OFF_SENTENCE = 'Games idle nonstop. Cooldowns that already started finish on their own.';
export const SCHEDULE_ACTIONS_NOTE =
  "New ranges apply from each game's next phase. Apply to current games picks new times for all of them now.";
