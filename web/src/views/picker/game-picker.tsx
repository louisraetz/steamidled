import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { PICKER_TOASTER_ID } from '@/lib/constants';
import { PickerBody } from './_/components/picker-body';
import { PickerHeader } from './_/components/picker-header';
import { PickerToolbar } from './_/components/picker-toolbar';
import { usePickerSheet } from './_/hooks/use-picker-sheet';

export function GamePicker() {
  const picker = usePickerSheet();
  return (
    <Sheet open={picker.open} onOpenChange={picker.changeOpen}>
      <SheetContent
        size="wide"
        onEscapeKeyDown={picker.onEscapeKeyDown}
        onInteractOutside={picker.onInteractOutside}
        onCloseAutoFocus={picker.onCloseAutoFocus}
      >
        <PickerHeader />
        <PickerToolbar sheet={picker.sheet} />
        <PickerBody sheet={picker.sheet} />
        <Toaster id={PICKER_TOASTER_ID} position="top-right" />
      </SheetContent>
    </Sheet>
  );
}
