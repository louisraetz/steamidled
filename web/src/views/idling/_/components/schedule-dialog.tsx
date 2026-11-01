import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { GameDisplay } from '../types/game-display';
import type { ScheduleDialogState } from '../types/schedule-dialog';
import { ScheduleDialogForm } from './schedule-dialog-form';

interface ScheduleDialogProps {
  game: GameDisplay;
  state: ScheduleDialogState;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

export function ScheduleDialog({ game, state, onOpenChange, onDone, onCloseAutoFocus }: ScheduleDialogProps) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <ScheduleDialogForm key={state.key} game={game} mode={state.mode} onDone={onDone} />
      </DialogContent>
    </Dialog>
  );
}
