import { NBSP } from '@/lib/constants';
import { formatCount } from '@/lib/format';
import { mono, plain, type TextPart } from '@/lib/text-parts';
import { SHARE_STEP, WINDOW_DAYS, WINDOW_HOURS, YIELD_STEP_HOURS } from '../constants/cycle-chart';
import type { CycleRanges, Lane } from '../types/cycle-chart';
import { collectingShare } from './cycle-lanes';

function hours(value: number): string {
  return `+${formatCount(Math.round(value))}h`;
}

function sharePercent(ranges: CycleRanges): number {
  const exact = collectingShare(ranges) * 100;
  const stepped = Math.round(exact / SHARE_STEP) * SHARE_STEP;
  if (stepped >= 100 && exact < 100) return Math.min(99, Math.round(exact));
  if (stepped <= 0 && exact > 0) return Math.max(1, Math.round(exact));
  return stepped;
}

function totalsParts(lanes: Lane[]): TextPart[] {
  const totals = lanes.map((lane) => lane.gained);
  const lowest = hours(Math.min(...totals));
  const highest = hours(Math.max(...totals));
  if (lowest === highest) return [mono(lowest), plain(' each.')];
  return [mono(lowest), plain(' to '), mono(highest), plain('.')];
}

export function profileShare(ranges: CycleRanges): TextPart[] {
  const percent = sharePercent(ranges);
  const gained = Math.round((percent / 100) * (WINDOW_HOURS / YIELD_STEP_HOURS)) * YIELD_STEP_HOURS;
  return [
    mono(`~${percent}%`),
    plain(`${NBSP}of${NBSP}the${NBSP}time${NBSP}· `),
    mono(hours(gained)),
    plain(`${NBSP}in${NBSP}${WINDOW_DAYS}${NBSP}days`),
  ];
}

export function cycleCaption(lanes: Lane[], ranges: CycleRanges, enabled: boolean): TextPart[] {
  if (!enabled) {
    return [
      plain(`After ${WINDOW_DAYS} days every game has `),
      mono(hours(WINDOW_HOURS)),
      plain('. Identical totals are easy to spot.'),
    ];
  }
  return [
    plain('Each game collects about '),
    mono(`${sharePercent(ranges)}%`),
    plain(` of the time. After ${WINDOW_DAYS} days: `),
    ...totalsParts(lanes),
  ];
}
