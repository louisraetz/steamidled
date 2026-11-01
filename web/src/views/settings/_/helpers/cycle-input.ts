import type { DeepPartial } from 'react-hook-form';
import type { ScheduleRanges } from '@/lib/settings';
import { RANGE_BY_KEY } from '../constants/schedule';
import type { CycleRanges } from '../types/cycle-chart';
import type { HoursByRange, RangeDefinition, RangeValues, ScheduleFormValues } from '../types/schedule-form';
import { isValidRange, savedRange } from './schedule-form';

function savedHours(range: RangeDefinition, ranges: ScheduleRanges): RangeValues {
  const [minField, maxField] = range.fields;
  return { min: ranges[minField], max: ranges[maxField] };
}

function liveHours(
  range: RangeDefinition,
  value: Partial<RangeValues> | undefined,
  ranges: ScheduleRanges
): RangeValues | null {
  const shown = savedRange(range, ranges);
  if (value?.min === shown.min && value?.max === shown.max) return savedHours(range, ranges);
  if (!isValidRange(value, range)) return null;
  return { min: value.min * range.hoursPerUnit, max: value.max * range.hoursPerUnit };
}

function holdPair(
  previous: RangeValues,
  range: RangeDefinition,
  value: Partial<RangeValues> | undefined,
  ranges: ScheduleRanges
): RangeValues {
  const next = liveHours(range, value, ranges);
  if (!next || (next.min === previous.min && next.max === previous.max)) return previous;
  return next;
}

export function initialHours(ranges: ScheduleRanges): HoursByRange {
  return { idle: savedHours(RANGE_BY_KEY.idle, ranges), cooldown: savedHours(RANGE_BY_KEY.cooldown, ranges) };
}

export function holdValidHours(
  previous: HoursByRange,
  values: DeepPartial<ScheduleFormValues>,
  ranges: ScheduleRanges
): HoursByRange {
  const idle = holdPair(previous.idle, RANGE_BY_KEY.idle, values.idle, ranges);
  const cooldown = holdPair(previous.cooldown, RANGE_BY_KEY.cooldown, values.cooldown, ranges);
  if (idle === previous.idle && cooldown === previous.cooldown) return previous;
  return { idle, cooldown };
}

export function toCycleRanges(hours: HoursByRange): CycleRanges {
  return {
    idleMin: hours.idle.min,
    idleMax: hours.idle.max,
    coolMin: hours.cooldown.min,
    coolMax: hours.cooldown.max,
  };
}

export function cycleRangesOf(ranges: ScheduleRanges): CycleRanges {
  return toCycleRanges(initialHours(ranges));
}
