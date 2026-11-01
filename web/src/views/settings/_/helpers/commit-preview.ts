import { pluralize } from '@/lib/format';
import { mono, plain, type TextPart } from '@/lib/text-parts';
import { HOURS_PER_DAY } from '@/lib/constants';

export function commitSegments(hours: number): number[] {
  return Array.from({ length: Math.max(1, Math.round(HOURS_PER_DAY / hours)) }, (_, index) => index);
}

export function commitSentence(hours: number): TextPart[] {
  return [
    mono(String(Math.round(HOURS_PER_DAY / hours))),
    plain(' quick reconnects a day. A crash loses at most the last '),
    mono(String(hours)),
    plain(` ${pluralize(hours, 'hour')}.`),
  ];
}
