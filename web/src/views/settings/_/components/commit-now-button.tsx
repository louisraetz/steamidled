import { Button } from '@/components/ui/button';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { canCommitPlaytime } from '../helpers/session';
import { useSessionActions } from '../hooks/use-session-actions';

export function CommitNowButton() {
  const canMutate = useCanMutate();
  const committable = useDaemonState(canCommitPlaytime) ?? false;
  const { commit } = useSessionActions();

  return (
    <div>
      <Button
        variant="outline"
        disabled={!canMutate || !committable}
        pending={commit.isPending}
        onClick={() => commit.mutate()}
      >
        Commit playtime now
      </Button>
    </div>
  );
}
