import { toast } from 'sonner';
import { api } from '@/lib/api';
import { pluralize } from '@/lib/format';
import { discardPendingSelection } from '@/lib/selection-sync';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';

export function useIdlingActions() {
  const stop = useSnapshotMutation(() => api.stopIdling(), {
    errorPrefix: "Couldn't stop idling.",
    onMutate: discardPendingSelection,
  });
  const startFavorites = useSnapshotMutation(() => api.startFavorites(), {
    errorPrefix: "Couldn't start the auto-start games.",
    onMutate: discardPendingSelection,
    onSuccess: (snapshot) => {
      const count = snapshot.games.length;
      toast.success(`Now idling ${count} ${pluralize(count, 'game')}.`);
    },
  });
  const retry = useSnapshotMutation(() => api.retry(), { errorPrefix: "Couldn't try again." });
  return { stop, startFavorites, retry };
}
