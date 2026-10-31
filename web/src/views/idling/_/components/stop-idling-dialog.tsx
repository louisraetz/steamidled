import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { StopIdlingDialogContent } from '@/components/stop-idling-dialog-content';

interface StopIdlingDialogProps {
  gameCount: number;
  disabled: boolean;
  pending: boolean;
  onConfirm: () => void;
}

export function StopIdlingDialog({ gameCount, disabled, pending, onConfirm }: StopIdlingDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} pending={pending}>
          Stop idling
        </Button>
      </AlertDialogTrigger>
      <StopIdlingDialogContent gameCount={gameCount} onConfirm={onConfirm} />
    </AlertDialog>
  );
}
