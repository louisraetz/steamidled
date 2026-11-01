import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { pluralize } from '@/lib/format';

interface EndCooldownsDialogProps {
  count: number;
  disabled: boolean;
  pending: boolean;
  onConfirm: () => void;
}

export function EndCooldownsDialog({ count, disabled, pending, onConfirm }: EndCooldownsDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" disabled={disabled} pending={pending}>
          End all cooldowns
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            End {count} {pluralize(count, 'cooldown')}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pluralize(count, 'The game collects', 'These games collect')} again right away and get a fresh idle phase.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>End cooldowns</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
