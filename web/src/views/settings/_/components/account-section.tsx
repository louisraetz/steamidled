import { api } from '@/lib/api';
import { discardPendingSelection } from '@/lib/selection-sync';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';
import { LogoutDialog } from './logout-dialog';
import { SettingsSection } from './settings-section';

export function AccountSection() {
  const accountName = useDaemonState((snapshot) => snapshot.accountName);
  const canMutate = useCanMutate();
  const logout = useSnapshotMutation(() => api.logout(), {
    errorPrefix: "Couldn't log out.",
    onMutate: discardPendingSelection,
  });

  return (
    <SettingsSection title="Steam account">
      <p>Signed in as {accountName}</p>
      <div>
        <LogoutDialog disabled={!canMutate} pending={logout.isPending} onConfirm={() => logout.mutate()} />
      </div>
    </SettingsSection>
  );
}
