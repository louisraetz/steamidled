import { selectionLock } from '@/lib/selection';
import type { SelectionLock } from '@/types/selection-lock';
import { useCanMutate } from './use-can-mutate';
import { useDaemonState } from './use-daemon-state';

export function useSelectionLock(): SelectionLock | null {
  const canMutate = useCanMutate();
  const lock = useDaemonState(selectionLock);
  if (!canMutate) return 'daemon';
  if (lock === undefined) return 'stopped';
  return lock;
}
