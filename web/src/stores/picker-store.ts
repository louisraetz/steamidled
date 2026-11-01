import { create } from 'zustand';
import type { PickerState } from '@/types/picker-state';

export const usePickerStore = create<PickerState>((set) => ({
  open: false,
  opener: null,
  setOpen: (open) => set({ open }),
  show: (opener) => set({ open: true, opener }),
}));
