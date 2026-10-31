import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSnapshotCache } from '@/hooks/use-snapshot';
import { SAVE_ERROR, UNDO_DURATION_MS } from '../constants/preferences';
import type { ExemptChange } from '../types/exempt-change';

export function useExemptMutation() {
  const cache = useSnapshotCache();
  const mutation = useMutation({
    mutationFn: ({ appId }: ExemptChange) => api.setExempt(appId),
    onMutate: async ({ appId }) => {
      await cache.cancel();
      const previous = cache.read()?.exemptAppId ?? null;
      cache.update((snapshot) => ({ ...snapshot, exemptAppId: appId }));
      return { previous };
    },
    onError: (_error, _change, context) => {
      cache.update((snapshot) => ({ ...snapshot, exemptAppId: context?.previous ?? null }));
      toast.error(SAVE_ERROR);
    },
    onSuccess: (snapshot, change) => {
      cache.write(snapshot);
      if (!change.announce || !change.previous || !change.name) return;
      const previous = change.previous;
      toast(`${change.name} is exempt now. ${previous.name} is back on the normal schedule.`, {
        duration: UNDO_DURATION_MS,
        action: {
          label: 'Undo',
          onClick: () =>
            mutation.mutate({ appId: previous.appId, name: previous.name, previous: null, announce: false }),
        },
      });
    },
  });
  return mutation;
}
