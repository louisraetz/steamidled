import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { NO_COOLDOWN_SAVE_ERROR, UNDO_DURATION_MS } from '@/lib/constants';
import { toastTarget } from '@/lib/toast-target';
import type { DaemonSnapshot } from '@/lib/types';
import type { ExemptChange } from '@/types/exempt-change';
import { useSnapshotCache } from './use-snapshot';

function withExempt(snapshot: DaemonSnapshot, appId: number | null): DaemonSnapshot {
  return {
    ...snapshot,
    exemptAppId: appId,
    games: snapshot.games.map((game) => ({ ...game, exempt: game.appid === appId })),
  };
}

export function useExemptMutation() {
  const cache = useSnapshotCache();
  const mutation = useMutation({
    mutationFn: ({ appId }: ExemptChange) => api.setExempt(appId),
    onMutate: async ({ appId }) => {
      await cache.cancel();
      const previous = cache.read()?.exemptAppId ?? null;
      cache.update((snapshot) => withExempt(snapshot, appId));
      return { previous };
    },
    onError: (_error, _change, context) => {
      cache.update((snapshot) => withExempt(snapshot, context?.previous ?? null));
      toast.error(NO_COOLDOWN_SAVE_ERROR, toastTarget());
    },
    onSuccess: (snapshot, change) => {
      cache.write(snapshot);
      if (!change.announce || !change.previous || !change.name) return;
      const previous = change.previous;
      toast(`${change.name} now skips cooldowns. ${previous.name} takes cooldowns again.`, {
        ...toastTarget(),
        duration: UNDO_DURATION_MS,
        action: {
          label: 'Undo',
          onClick: () => mutation.mutate({ appId: previous.appId, name: previous.name, previous: null, announce: false }),
        },
      });
    },
  });
  return mutation;
}
