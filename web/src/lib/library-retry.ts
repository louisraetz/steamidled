import { nextTry, plain, type TextPart } from '@/lib/text-parts';
import type { DaemonSnapshot } from '@/lib/types';

export const LIBRARY_RETRY_TITLE = "Couldn't load your library";

export function libraryRetryAt(snapshot: DaemonSnapshot): number | null {
  return snapshot.phase === 'loading-library' ? snapshot.nextRetryAt : null;
}

export function libraryRetryBody(nextRetryAt: number, now: number): TextPart[] {
  return [
    plain("Steam didn't answer in time. This usually clears up within a minute. Next try "),
    ...nextTry(nextRetryAt, now),
    plain('.'),
  ];
}
