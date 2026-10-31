import { api } from '@/lib/api';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';

export function useLoginActions() {
  const startQr = useSnapshotMutation(() => api.loginQr(), { silent: true });
  const password = useSnapshotMutation(
    ({ accountName, password: secret }: { accountName: string; password: string }) =>
      api.loginPassword(accountName, secret),
    { silent: true }
  );
  const guard = useSnapshotMutation((code: string) => api.loginGuard(code), { silent: true });
  const cancel = useSnapshotMutation(() => api.cancelLogin(), { silent: true });
  return { startQr, password, guard, cancel };
}
