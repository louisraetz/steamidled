import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DISCARD_TITLE } from '../constants/draft';
import { draftSummary } from '../helpers/draft-summary';
import type { PickerDraft } from '../types/picker-draft';

interface DiscardChangesDialogProps {
  open: boolean;
  draft: PickerDraft;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}

export function DiscardChangesDialog({ open, draft, onOpenChange, onDiscard }: DiscardChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{DISCARD_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>
            Not applied yet: {draftSummary(draft.added, draft.removed)}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard}>Discard</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
