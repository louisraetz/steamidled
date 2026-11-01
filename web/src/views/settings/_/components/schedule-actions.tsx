import { Button } from '@/components/ui/button';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { SCHEDULE_ACTIONS_NOTE } from '../constants/schedule';
import { coolingCount, hasIdlingGames } from '../helpers/session';
import { useScheduleActions } from '../hooks/use-schedule-actions';
import { EndCooldownsDialog } from './end-cooldowns-dialog';

export function ScheduleActions() {
  const canMutate = useCanMutate();
  const session = useDaemonState(hasIdlingGames) ?? false;
  const enabled = useDaemonState((snapshot) => snapshot.settings.schedule.enabled) ?? true;
  const cooling = useDaemonState(coolingCount) ?? 0;
  const { reroll, endAll } = useScheduleActions();
  const available = canMutate && session;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={!available || !enabled}
          pending={reroll.isPending}
          onClick={() => reroll.mutate()}
        >
          Apply to current games
        </Button>
        <EndCooldownsDialog
          count={cooling}
          disabled={!available || cooling === 0}
          pending={endAll.isPending}
          onConfirm={() => endAll.mutate(cooling)}
        />
      </div>
      <p className="max-w-prose text-sm text-muted-foreground">{SCHEDULE_ACTIONS_NOTE}</p>
    </>
  );
}
