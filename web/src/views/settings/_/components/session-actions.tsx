import { Button } from '@/components/ui/button';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { canCommitPlaytime, canRetry } from '../helpers/session';
import { useSessionActions } from '../hooks/use-session-actions';
import { RetryNowButton } from './retry-now-button';

export function SessionActions() {
  const canMutate = useCanMutate();
  const committable = useDaemonState(canCommitPlaytime) ?? false;
  const retryable = useDaemonState(canRetry) ?? false;
  const { commit, retry } = useSessionActions();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        disabled={!canMutate || !committable}
        pending={commit.isPending}
        onClick={() => commit.mutate()}
      >
        Commit playtime now
      </Button>
      <RetryNowButton
        visible={retryable}
        disabled={!canMutate}
        pending={retry.isPending}
        onClick={() => retry.mutate()}
      />
    </div>
  );
}
