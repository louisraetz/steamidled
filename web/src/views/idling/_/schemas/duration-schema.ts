import { z } from 'zod';
import { formatHoursLabel } from '../helpers/duration';
import { UNIT_HOURS } from '../constants/menu';

export function durationSchema(maxHours: number) {
  return z
    .object({
      amount: z.number({ error: 'Enter a number.' }).int('Use a whole number.').min(1, 'Use at least 1.'),
      unit: z.enum(['hours', 'days']),
    })
    .refine((values) => values.amount * UNIT_HOURS[values.unit] <= maxHours, {
      message: `At most ${formatHoursLabel(maxHours)}.`,
      path: ['amount'],
    });
}
