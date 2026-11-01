import { useRef, useState } from 'react';
import type { ScheduleDialogMode, ScheduleDialogState } from '../types/schedule-dialog';

export function useScheduleDialog() {
  const [state, setState] = useState<ScheduleDialogState>({ open: false, mode: 'cooldown-now', key: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  return {
    state,
    triggerRef,
    show: (mode: ScheduleDialogMode) => setState((current) => ({ open: true, mode, key: current.key + 1 })),
    close: () => setState((current) => ({ ...current, open: false })),
    changeOpen: (open: boolean) => {
      if (!open) setState((current) => ({ ...current, open: false }));
    },
    returnFocus: (event: Event) => {
      event.preventDefault();
      triggerRef.current?.focus();
    },
  };
}
