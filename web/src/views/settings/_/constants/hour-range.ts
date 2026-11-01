import { HOURS_PER_DAY } from '@/lib/constants';

export const HOUR_UNITS = {
  days: { hours: HOURS_PER_DAY, short: 'd', singular: 'day', plural: 'days' },
  hours: { hours: 1, short: 'h', singular: 'hour', plural: 'hours' },
} as const;
