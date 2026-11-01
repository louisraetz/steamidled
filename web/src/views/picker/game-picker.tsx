import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { PICKER_TOASTER_ID } from '@/lib/constants';
import { DiscardChangesDialog } from './_/components/discard-changes-dialog';
import { PickerBody } from './_/components/picker-body';
import { PickerFooter } from './_/components/picker-footer';
import { PickerHeader } from './_/components/picker-header';
import { PickerToolbar } from './_/components/picker-toolbar';
import { usePickerSheet } from './_/hooks/use-picker-sheet';

export function GamePicker() {
  const picker = usePickerSheet();
  const { draft } = picker.sheet;
  return (
    <Sheet open={picker.open} onOpenChange={picker.changeOpen}>
      <SheetContent
        size="wide"
        onEscapeKeyDown={picker.onEscapeKeyDown}
        onInteractOutside={picker.onInteractOutside}
        onCloseAutoFocus={picker.onCloseAutoFocus}
      >
        <PickerHeader count={draft.count} />
        <PickerToolbar sheet={picker.sheet} />
        <PickerBody sheet={picker.sheet} />
        <PickerFooter draft={draft} onApply={picker.apply} />
        <DiscardChangesDialog
          open={picker.confirmingDiscard}
          draft={draft}
          onOpenChange={picker.setConfirmingDiscard}
          onDiscard={picker.discard}
        />
        <Toaster id={PICKER_TOASTER_ID} position="top-right" />
      </SheetContent>
    </Sheet>
  );
}
