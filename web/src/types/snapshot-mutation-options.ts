import type { DaemonSnapshot } from '@/lib/types';

export interface SnapshotMutationOptions<Variables> {
  errorPrefix?: string;
  silent?: boolean;
  onSuccess?: (snapshot: DaemonSnapshot, variables: Variables) => void;
}
