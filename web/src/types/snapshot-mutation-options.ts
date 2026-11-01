import type { DaemonSnapshot } from '@/lib/types';

export interface SnapshotMutationOptions<Variables> {
  errorPrefix?: string;
  silent?: boolean;
  onMutate?: () => void;
  onSuccess?: (snapshot: DaemonSnapshot, variables: Variables) => void;
}
