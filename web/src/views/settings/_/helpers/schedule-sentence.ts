import { pluralize } from '@/lib/format';
import { mono, plain, type TextPart } from '@/lib/text-parts';
import { RANGE_BY_KEY, SCHEDULE_OFF_SENTENCE } from '../constants/schedule';
import type { HoursByRange, RangeDefinition } from '../types/schedule-form';
import { unitsOf } from './schedule-form';

function rangeParts(range: RangeDefinition, hours: HoursByRange): TextPart[] {
  const values = unitsOf(hours[range.key], range);
  const unit = pluralize(values.max, range.unitSingular, range.unit);
  if (values.min === values.max) return [mono(String(values.max)), plain(` ${unit}`)];
  return [mono(`${values.min}–${values.max}`), plain(` ${unit}`)];
}

export function scheduleSentence(enabled: boolean, hours: HoursByRange): TextPart[] {
  if (!enabled) return [plain(SCHEDULE_OFF_SENTENCE)];
  return [
    plain('Each game idles '),
    ...rangeParts(RANGE_BY_KEY.idle, hours),
    plain(', then rests '),
    ...rangeParts(RANGE_BY_KEY.cooldown, hours),
    plain('.'),
  ];
}
