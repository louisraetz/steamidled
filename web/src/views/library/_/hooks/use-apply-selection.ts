import { toast } from 'sonner';
import { api } from '@/lib/api';
import { pluralize } from '@/lib/format';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';
import { usePendingSelectionStore } from '../stores/pending-selection-store';

export function useApplySelection() {
  const discard = usePendingSelectionStore((state) => state.discard);
  return useSnapshotMutation((appIds: number[]) => api.setSelection(appIds), {
    errorPrefix: "Couldn't apply changes.",
    onSuccess: (snapshot) => {
      discard();
      const count = snapshot.games.length;
      toast.success(`Now idling ${count} ${pluralize(count, 'game')}.`);
    },
  });
}
