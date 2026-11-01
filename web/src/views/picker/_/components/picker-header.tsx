import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MAX_IDLE_GAMES } from '@/lib/constants';
import { RefreshLibraryButton } from './refresh-library-button';
import { SlotMeter } from './slot-meter';

export function PickerHeader({ count }: { count: number }) {
  return (
    <SheetHeader>
      <div className="flex items-center gap-2">
        <SheetTitle>Add games</SheetTitle>
        <RefreshLibraryButton />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SheetDescription aria-live="polite">
          <span className="font-mono">{count}</span> of <span className="font-mono">{MAX_IDLE_GAMES}</span> slots used
        </SheetDescription>
        <SlotMeter count={count} />
      </div>
    </SheetHeader>
  );
}
