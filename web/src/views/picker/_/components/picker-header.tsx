import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { MAX_IDLE_GAMES } from '@/lib/constants';
import { RefreshLibraryButton } from './refresh-library-button';
import { SlotMeter } from './slot-meter';

export function PickerHeader() {
  const count = useDaemonState((snapshot) => snapshot.games.length) ?? 0;
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
