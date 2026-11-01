import type { DaemonSnapshot } from '@/lib/types';

export interface OptimisticMutationOptions<Variables, Slice> {
  mutationFn: (variables: Variables) => Promise<DaemonSnapshot>;
  select: (snapshot: DaemonSnapshot) => Slice;
  merge: (snapshot: DaemonSnapshot, slice: Slice) => DaemonSnapshot;
  apply: (slice: Slice, variables: Variables) => Slice;
  errorPrefix: string;
}
