import { api } from '@/lib/api';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';
import { usePendingSelectionStore } from '../stores/pending-selection-store';

export function useStopSelection() {
  const discard = usePendingSelectionStore((state) => state.discard);
  return useSnapshotMutation(() => api.stopIdling(), {
    errorPrefix: "Couldn't stop idling.",
    onSuccess: () => discard(),
  });
}
