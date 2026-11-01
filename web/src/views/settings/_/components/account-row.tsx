import { Item, ItemActions, ItemContent, ItemMedia } from '@/components/ui/item';
import { api } from '@/lib/api';
import { discardPendingSelection } from '@/lib/selection-sync';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';
import { LogoutDialog } from './logout-dialog';
import { MascotAvatar } from './mascot-avatar';

export function AccountRow() {
  const accountName = useDaemonState((snapshot) => snapshot.accountName);
  const canMutate = useCanMutate();
  const logout = useSnapshotMutation(() => api.logout(), {
    errorPrefix: "Couldn't log out.",
    onMutate: discardPendingSelection,
  });

  return (
    <Item size="flush">
      <ItemMedia>
        <MascotAvatar variant="awake" className="size-7" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <span className="truncate">
          Signed in as <span className="font-semibold">{accountName}</span>
        </span>
      </ItemContent>
      <ItemActions>
        <LogoutDialog disabled={!canMutate} pending={logout.isPending} onConfirm={() => logout.mutate()} />
      </ItemActions>
    </Item>
  );
}
