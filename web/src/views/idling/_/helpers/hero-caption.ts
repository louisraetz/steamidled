import { formatPhase, formatSession, pluralize } from '@/lib/format';
import { mono, monoWords, plain, type TextPart } from '@/lib/text-parts';
import type { HeroCaptionInput } from '../types/hero-caption-input';

function rateParts(counting: number): TextPart[] {
  if (counting === 0) return [plain('nothing collecting right now')];
  return [{ text: `+${counting}h`, className: 'font-mono text-success' }, plain(' every hour')];
}

function sleepingParts({ gameCount, nextIdleAt, now }: HeroCaptionInput): TextPart[] {
  return [
    plain('All '),
    mono(String(gameCount)),
    plain(` ${pluralize(gameCount, 'game')} ${pluralize(gameCount, 'is', 'are')} cooling down. The next one idles again in `),
    ...monoWords(formatPhase(Math.max(0, (nextIdleAt ?? now) - now))),
    plain('.'),
  ];
}

function upParts({ idlingSince, now }: HeroCaptionInput): TextPart[] {
  if (idlingSince === null) return [];
  return [plain(' · up '), ...monoWords(formatPhase(now - idlingSince))];
}

function todayParts({ todayMs }: HeroCaptionInput): TextPart[] {
  if (todayMs === null) return [];
  return [plain(' · today '), mono(formatSession(todayMs))];
}

export function heroCaption(input: HeroCaptionInput): TextPart[] {
  if (input.sleeping) return sleepingParts(input);
  return [
    plain('hours collected this session · '),
    ...rateParts(input.counting),
    ...upParts(input),
    ...todayParts(input),
  ];
}
