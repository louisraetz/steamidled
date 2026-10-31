import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorText } from '@/lib/error-text';
import type { DaemonSnapshot } from '@/lib/types';
import type { SnapshotMutationOptions } from '@/types/snapshot-mutation-options';
import { useSnapshotCache } from './use-snapshot';

export function useSnapshotMutation<Variables = void>(
  mutationFn: (variables: Variables) => Promise<DaemonSnapshot>,
  options: SnapshotMutationOptions<Variables> = {}
) {
  const cache = useSnapshotCache();
  return useMutation({
    mutationFn,
    onSuccess: (snapshot, variables) => {
      cache.write(snapshot);
      options.onSuccess?.(snapshot, variables);
    },
    onError: (error) => {
      if (options.silent) return;
      toast.error(errorText(error, options.errorPrefix));
    },
  });
}
