import type { ScheduleRangeField } from '@/lib/settings';

export type RangeKey = 'idle' | 'cooldown';

export interface RangeValues {
  min: number;
  max: number;
}

export type ScheduleFormValues = Record<RangeKey, RangeValues>;

export type HoursByRange = Record<RangeKey, RangeValues>;

export interface RangeDefinition {
  key: RangeKey;
  label: string;
  unit: string;
  unitSingular: string;
  hoursPerUnit: number;
  min: number;
  max: number;
  fields: readonly [ScheduleRangeField, ScheduleRangeField];
}
