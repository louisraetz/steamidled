import { useDaemonState } from '@/hooks/use-daemon-state';
import { MAX_FAVORITE_SKELETON_ROWS, SKELETON_ROWS } from '../constants/skeleton';
import { LibrarySkeletonGroup } from './library-skeleton-group';

export function LibrarySkeleton() {
  const favorites = useDaemonState((snapshot) => snapshot.favorites.length) ?? 0;
  const favoriteRows = SKELETON_ROWS.slice(0, Math.min(favorites, MAX_FAVORITE_SKELETON_ROWS));

  return (
    <div className="flex flex-col gap-4 appear-delayed" aria-hidden="true">
      <LibrarySkeletonGroup rows={favoriteRows} />
      <LibrarySkeletonGroup rows={SKELETON_ROWS} />
    </div>
  );
}
