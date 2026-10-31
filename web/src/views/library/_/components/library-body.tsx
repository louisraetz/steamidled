import { useDaemonState } from '@/hooks/use-daemon-state';
import { useLibrary } from '@/hooks/use-library';
import { libraryRetryAt } from '@/lib/library-retry';
import { LibraryAccountEmpty } from './library-account-empty';
import { LibraryContent } from './library-content';
import { LibraryError } from './library-error';
import { LibraryRetryAlert } from './library-retry-alert';
import { LibrarySkeleton } from './library-skeleton';

export function LibraryBody() {
  const library = useLibrary();
  const retryAt = useDaemonState(libraryRetryAt) ?? null;
  if (retryAt !== null) return <LibraryRetryAlert nextRetryAt={retryAt} />;
  if (library.isError) return <LibraryError retrying={library.isFetching} onRetry={() => void library.refetch()} />;
  if (!library.data) return <LibrarySkeleton />;
  if (library.data.length === 0) return <LibraryAccountEmpty />;
  return <LibraryContent games={library.data} />;
}
