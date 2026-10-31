import { create } from 'zustand';
import { MAX_IDLE_GAMES } from '@/lib/constants';
import { toggleInList } from '../helpers/selection-diff';
import type { PendingSelectionState } from '../types/pending-selection-state';

export const usePendingSelectionStore = create<PendingSelectionState>((set, get) => ({
  accountName: null,
  draft: null,
  toggle: (appid, base, accountName) => {
    const current = get();
    const start = current.draft && current.accountName === accountName ? current.draft : base;
    const next = toggleInList(start, appid);
    if (next.length > MAX_IDLE_GAMES) return;
    set({ draft: next, accountName });
  },
  replace: (appIds, accountName) => set({ draft: appIds.slice(0, MAX_IDLE_GAMES), accountName }),
  discard: () => set({ draft: null }),
}));
