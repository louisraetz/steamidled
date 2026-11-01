import { api } from '@/lib/api';
import { selectionLock } from '@/lib/selection';
import { useCanMutate } from './use-can-mutate';
import { useDaemonState } from './use-daemon-state';
import { useSnapshotMutation } from './use-snapshot-mutation';

export function useRefreshLibrary() {
  const canMutate = useCanMutate();
  const refreshing = useDaemonState((snapshot) => snapshot.libraryRefreshing) ?? false;
  const available = useDaemonState((snapshot) => selectionLock(snapshot) === null) ?? false;
  const mutation = useSnapshotMutation(() => api.refreshLibrary(), { errorPrefix: "Couldn't refresh the library." });
  const busy = refreshing || mutation.isPending;
  return {
    refreshing: busy,
    disabled: !canMutate || !available || busy,
    refresh: () => mutation.mutate(),
  };
}
