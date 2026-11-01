import { useDaemonState } from '@/hooks/use-daemon-state';
import { useLibrary } from '@/hooks/use-library';
import { libraryRetryAt } from '@/lib/library-retry';
import type { PickerSheet } from '../types/picker-sheet';
import { LibraryAccountEmpty } from './library-account-empty';
import { LibraryError } from './library-error';
import { LibraryRetryAlert } from './library-retry-alert';
import { LibrarySkeleton } from './library-skeleton';
import { PickerResults } from './picker-results';

export function LibraryState({ sheet }: { sheet: PickerSheet }) {
  const library = useLibrary();
  const retryAt = useDaemonState(libraryRetryAt) ?? null;
  if (retryAt !== null) return <LibraryRetryAlert nextRetryAt={retryAt} />;
  if (library.isError) return <LibraryError retrying={library.isFetching} onRetry={() => void library.refetch()} />;
  if (!library.data) return <LibrarySkeleton />;
  if (library.data.length === 0) return <LibraryAccountEmpty />;
  return <PickerResults games={library.data} sheet={sheet} />;
}
