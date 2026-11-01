import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function StopIdlingDialogContent({ gameCount, onConfirm }: { gameCount: number; onConfirm: () => void }) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Stop idling?</AlertDialogTitle>
        <AlertDialogDescription>
          All {gameCount} games stop collecting playtime. You stay signed in, and auto-start games start again on the
          next restart.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Stop idling</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
