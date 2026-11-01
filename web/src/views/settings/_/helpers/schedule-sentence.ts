import { pluralize } from '@/lib/format';
import type { ScheduleSettings } from '@/lib/settings';
import { mono, plain, type TextPart } from '@/lib/text-parts';
import { RANGE_BY_KEY, SCHEDULE_OFF_SENTENCE } from '../constants/schedule';
import type { DeepPartial } from 'react-hook-form';
import type { RangeDefinition, RangeValues, ScheduleFormValues } from '../types/schedule-form';
import { isValidRange, savedRange } from './schedule-form';

function liveRange(
  range: RangeDefinition,
  values: Partial<RangeValues> | undefined,
  schedule: ScheduleSettings
): RangeValues {
  return isValidRange(values, range) ? values : savedRange(range, schedule);
}

function rangeParts(range: RangeDefinition, values: RangeValues): TextPart[] {
  const unit = pluralize(values.max, range.unitSingular, range.unit);
  if (values.min === values.max) return [mono(String(values.max)), plain(` ${unit}`)];
  return [mono(`${values.min}–${values.max}`), plain(` ${unit}`)];
}

export function scheduleSentence(
  enabled: boolean,
  values: DeepPartial<ScheduleFormValues>,
  schedule: ScheduleSettings
): TextPart[] {
  if (!enabled) return [plain(SCHEDULE_OFF_SENTENCE)];
  const idle = liveRange(RANGE_BY_KEY.idle, values.idle, schedule);
  const cooldown = liveRange(RANGE_BY_KEY.cooldown, values.cooldown, schedule);
  return [
    plain('Each game idles '),
    ...rangeParts(RANGE_BY_KEY.idle, idle),
    plain(', then rests '),
    ...rangeParts(RANGE_BY_KEY.cooldown, cooldown),
    plain('.'),
  ];
}
