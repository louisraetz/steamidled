import { useSyncExternalStore } from 'react';
import { clockTick, subscribeClock } from '@/lib/clock';
import { useConnectionStore } from '@/stores/connection-store';

export function useNow(): number {
  useSyncExternalStore(subscribeClock, clockTick);
  const offset = useConnectionStore((state) => state.offset);
  const frozenAt = useConnectionStore((state) => state.frozenAt);
  return frozenAt ?? Date.now() + offset;
}
