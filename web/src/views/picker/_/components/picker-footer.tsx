import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import { APPLY_LABEL, NO_CHANGES_LABEL } from '../constants/draft';
import { draftSummary } from '../helpers/draft-summary';
import type { PickerDraft } from '../types/picker-draft';

export function PickerFooter({ draft, onApply }: { draft: PickerDraft; onApply: () => void }) {
  return (
    <SheetFooter className="flex-row items-center justify-between gap-4 border-t">
      <p aria-live="polite" className="min-w-0 truncate data-[dirty=false]:text-tertiary" data-dirty={draft.dirty}>
        {draft.dirty ? draftSummary(draft.added, draft.removed) : NO_CHANGES_LABEL}
      </p>
      <Button disabled={!draft.dirty || draft.locked} onClick={onApply}>
        {APPLY_LABEL}
      </Button>
    </SheetFooter>
  );
}
