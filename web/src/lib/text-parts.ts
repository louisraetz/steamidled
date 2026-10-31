import { formatCountdown } from '@/lib/format';

export interface TextPart {
  text: string;
  className?: string;
}

export function plain(text: string): TextPart {
  return { text };
}

export function mono(text: string): TextPart {
  return { text, className: 'font-mono' };
}

export function nextTry(target: number | null, now: number): TextPart[] {
  if (target === null) return [plain('shortly')];
  return [plain('in '), mono(formatCountdown(target - now))];
}
