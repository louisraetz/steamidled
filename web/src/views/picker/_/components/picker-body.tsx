import { ScrollArea } from '@/components/ui/scroll-area';
import type { PickerSheet } from '../types/picker-sheet';
import { LibraryState } from './library-state';

export function PickerBody({ sheet }: { sheet: PickerSheet }) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-4 px-4 pb-6 sm:px-6">
        <LibraryState sheet={sheet} />
      </div>
    </ScrollArea>
  );
}
