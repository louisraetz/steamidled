import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorText } from '@/lib/error-text';
import type { OptimisticMutationOptions } from '@/types/optimistic-mutation-options';
import { useSnapshotCache } from './use-snapshot';

export function useOptimisticSnapshotMutation<Variables, Slice>(options: OptimisticMutationOptions<Variables, Slice>) {
  const cache = useSnapshotCache();
  return useMutation({
    mutationFn: options.mutationFn,
    onMutate: async (variables: Variables) => {
      await cache.cancel();
      const current = cache.read();
      const previous = current === undefined ? undefined : options.select(current);
      cache.update((snapshot) => options.merge(snapshot, options.apply(options.select(snapshot), variables)));
      return { previous };
    },
    onError: (error, _variables, context) => {
      const previous = context?.previous;
      if (previous !== undefined) cache.update((snapshot) => options.merge(snapshot, previous));
      toast.error(errorText(error, options.errorPrefix));
    },
    onSuccess: (snapshot) => cache.write(snapshot),
  });
}
