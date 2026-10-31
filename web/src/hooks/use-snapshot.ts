import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { DaemonSnapshot } from '@/lib/types';

export function useSnapshotCache() {
  const queryClient = useQueryClient();
  return {
    read: () => queryClient.getQueryData<DaemonSnapshot>(queryKeys.state),
    write: (snapshot: DaemonSnapshot) => queryClient.setQueryData(queryKeys.state, snapshot),
    update: (updater: (snapshot: DaemonSnapshot) => DaemonSnapshot) =>
      queryClient.setQueryData<DaemonSnapshot>(queryKeys.state, (current) => current && updater(current)),
    cancel: () => queryClient.cancelQueries({ queryKey: queryKeys.state }),
  };
}
