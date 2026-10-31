import { useSyncExternalStore } from 'react';
import { CLOCK_TICK_MS } from '@/lib/constants';
import { useConnectionStore } from '@/stores/connection-store';

const listeners = new Set<() => void>();
let tick = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      tick += 1;
      for (const notify of listeners) notify();
    }, CLOCK_TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getTick(): number {
  return tick;
}

export function useNow(): number {
  useSyncExternalStore(subscribe, getTick);
  const offset = useConnectionStore((state) => state.offset);
  const frozenAt = useConnectionStore((state) => state.frozenAt);
  return frozenAt ?? Date.now() + offset;
}
