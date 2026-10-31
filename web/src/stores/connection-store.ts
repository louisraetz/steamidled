import { create } from 'zustand';
import type { ConnectionState } from '@/types/connection-state';

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'connecting',
  offset: 0,
  frozenAt: null,
  markOpen: () => set({ status: 'connected', frozenAt: null }),
  markLost: () => {
    if (get().status === 'reconnecting') return;
    set({ status: 'reconnecting', frozenAt: Date.now() + get().offset });
  },
  syncClock: (serverTime) => set({ offset: serverTime - Date.now() }),
}));
