import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';

export function useSessionActions() {
  const commit = useSnapshotMutation(() => api.flushNow(), {
    errorPrefix: "Couldn't commit playtime.",
    onSuccess: () => toast.success('Committing playtime. steamidled reconnects for a moment.'),
  });
  const retry = useSnapshotMutation(() => api.retry(), { errorPrefix: "Couldn't reconnect." });
  return { commit, retry };
}
