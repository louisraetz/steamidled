import { useMemo } from 'react';
import { EMPTY_IDS } from '@/lib/constants';
import { selectionOf } from '@/lib/selection';
import { useDaemonState } from './use-daemon-state';
import { useSelectionLock } from './use-selection-lock';

export function useSelection() {
  const selected = useDaemonState(selectionOf) ?? EMPTY_IDS;
  const lock = useSelectionLock();
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return { selected, selectedSet, lock, locked: lock !== null };
}
