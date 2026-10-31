import { AlertDialog } from '@/components/ui/alert-dialog';
import { StopIdlingDialogContent } from '@/components/stop-idling-dialog-content';

interface StopSelectionDialogProps {
  open: boolean;
  gameCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function StopSelectionDialog({ open, gameCount, onOpenChange, onConfirm }: StopSelectionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <StopIdlingDialogContent gameCount={gameCount} onConfirm={onConfirm} />
    </AlertDialog>
  );
}
