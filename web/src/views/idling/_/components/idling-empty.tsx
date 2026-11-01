import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { IdleMascot } from '@/components/idle-mascot';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { MAX_IDLE_GAMES } from '@/lib/constants';
import { usePickerStore } from '@/stores/picker-store';
import { StartAutoStartButton } from './start-auto-start-button';

export function IdlingEmpty() {
  const autoStart = useDaemonState((snapshot) => snapshot.favoritesInLibrary) ?? 0;
  const showPicker = usePickerStore((state) => state.show);

  return (
    <Empty>
      <EmptyMedia>
        <IdleMascot variant="awake" blink className="size-24" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>Nothing is idling</EmptyTitle>
        <EmptyDescription>
          Pick up to {MAX_IDLE_GAMES} games. steamidled plays them in the background so their hours keep growing.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button data-picker-opener onClick={(event) => showPicker(event.currentTarget)}>
          <Plus />
          Add games
        </Button>
        <StartAutoStartButton count={autoStart} />
      </EmptyContent>
    </Empty>
  );
}
