import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { usePickerStore } from '@/stores/picker-store';
import { useIdlingActions } from '../hooks/use-idling-actions';
import { StopIdlingDialog } from './stop-idling-dialog';

export function IdlingActions({ gameCount }: { gameCount: number }) {
  const active = useDaemonState((snapshot) => snapshot.phase === 'idling') ?? false;
  const canMutate = useCanMutate();
  const showPicker = usePickerStore((state) => state.show);
  const { stop } = useIdlingActions();

  return (
    <div className="order-last flex items-center gap-2 sm:order-none">
      <Button data-picker-opener onClick={(event) => showPicker(event.currentTarget)}>
        <Plus />
        Add games
      </Button>
      <StopIdlingDialog
        gameCount={gameCount}
        disabled={!canMutate || !active}
        pending={stop.isPending}
        onConfirm={() => stop.mutate()}
      />
    </div>
  );
}
