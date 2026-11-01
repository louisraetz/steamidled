import { NBSP } from '@/lib/constants';
import { pluralize } from '@/lib/format';
import { HOUR_UNITS } from '../constants/hour-range';

function unitFor(min: number, max: number) {
  const { days } = HOUR_UNITS;
  return min % days.hours === 0 && max % days.hours === 0 ? days : HOUR_UNITS.hours;
}

function span(min: number, max: number): string {
  if (min === max) return String(max);
  return `${min}–${max}`;
}

export function shortHourRange(min: number, max: number): string {
  const unit = unitFor(min, max);
  return `${span(min / unit.hours, max / unit.hours)}${unit.short}`;
}

export function longHourRange(min: number, max: number): string {
  const unit = unitFor(min, max);
  const top = max / unit.hours;
  return `${span(min / unit.hours, top)}${NBSP}${pluralize(top, unit.singular, unit.plural)}`;
}
