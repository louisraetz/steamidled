import type { ScheduleSettings } from '@/lib/settings';
import type { RangeDefinition, RangeValues, ScheduleFormValues } from '../types/schedule-form';
import { RANGE_BY_KEY } from '../constants/schedule';

function toUnits(hours: number, range: RangeDefinition): number {
  return Math.round((hours / range.hoursPerUnit) * 10) / 10;
}

function clamp(value: number, range: RangeDefinition, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(range.max, Math.max(range.min, value));
}

export function savedRange(range: RangeDefinition, schedule: ScheduleSettings): RangeValues {
  const [minField, maxField] = range.fields;
  return { min: toUnits(schedule[minField], range), max: toUnits(schedule[maxField], range) };
}

export function toFormValues(schedule: ScheduleSettings): ScheduleFormValues {
  return {
    idle: savedRange(RANGE_BY_KEY.idle, schedule),
    cooldown: savedRange(RANGE_BY_KEY.cooldown, schedule),
  };
}

export function rangePatch(range: RangeDefinition, values: RangeValues): Partial<ScheduleSettings> {
  const [minField, maxField] = range.fields;
  return {
    [minField]: Math.round(values.min * range.hoursPerUnit),
    [maxField]: Math.round(values.max * range.hoursPerUnit),
  };
}

export function isSavedRange(range: RangeDefinition, values: RangeValues, schedule: ScheduleSettings): boolean {
  const patch = rangePatch(range, values);
  return range.fields.every((field) => patch[field] === schedule[field]);
}

export function sliderValue(values: RangeValues | undefined, range: RangeDefinition): number[] {
  const min = clamp(values?.min ?? range.min, range, range.min);
  const max = clamp(values?.max ?? range.max, range, range.max);
  return [Math.min(min, max), Math.max(min, max)];
}

export function isValidRange(values: Partial<RangeValues> | undefined, range: RangeDefinition): values is RangeValues {
  const min = values?.min ?? Number.NaN;
  const max = values?.max ?? Number.NaN;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
  return min >= range.min && max <= range.max && min <= max;
}

export function sameRange(a: RangeValues, b: RangeValues): boolean {
  return a.min === b.min && a.max === b.max;
}
