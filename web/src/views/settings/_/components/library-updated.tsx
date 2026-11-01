import { useDaemonState } from '@/hooks/use-daemon-state';
import { useMinuteNow } from '@/hooks/use-minute-now';
import { libraryUpdatedText } from '../helpers/library-updated';

export function LibraryUpdated() {
  const now = useMinuteNow();
  const updatedAt = useDaemonState((snapshot) => snapshot.libraryUpdatedAt) ?? null;
  return (
    <span aria-live="polite" className="text-muted-foreground">
      {libraryUpdatedText(updatedAt, now)}
    </span>
  );
}
