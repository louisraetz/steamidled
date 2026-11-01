import { useSyncExternalStore } from 'react';
import { subscribeClock } from '@/lib/clock';
import { MINUTE_MS } from '@/lib/constants';
import { useConnectionStore } from '@/stores/connection-store';

export function useMinuteNow(): number {
  const offset = useConnectionStore((state) => state.offset);
  const frozenAt = useConnectionStore((state) => state.frozenAt);
  return useSyncExternalStore(subscribeClock, () => {
    const now = frozenAt ?? Date.now() + offset;
    return now - (now % MINUTE_MS);
  });
}
