import { z } from 'zod';
import { RANGE_BY_KEY } from '../constants/schedule';
import type { RangeDefinition } from '../types/schedule-form';

function boundedNumber(range: RangeDefinition) {
  return z
    .number({ error: 'Enter a number.' })
    .min(range.min, `At least ${range.min} ${range.unitSingular}.`)
    .max(range.max, `At most ${range.max} ${range.unit}.`);
}

function rangeSchema(range: RangeDefinition) {
  return z
    .object({ min: boundedNumber(range), max: boundedNumber(range) })
    .refine((values) => values.min <= values.max, {
      message: "The first number can't be bigger than the second.",
      path: ['max'],
    });
}

export const scheduleFormSchema = z.object({
  idle: rangeSchema(RANGE_BY_KEY.idle),
  cooldown: rangeSchema(RANGE_BY_KEY.cooldown),
});
