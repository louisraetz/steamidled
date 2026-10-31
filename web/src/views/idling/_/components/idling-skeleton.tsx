import { Skeleton } from '@/components/ui/skeleton';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { MAX_IDLE_GAMES } from '@/lib/constants';
import { UNKNOWN_SKELETON_ROWS } from '../constants/skeleton';

export function IdlingSkeleton() {
  const count = useDaemonState((snapshot) => snapshot.favorites.length) ?? 0;
  const rows = Array.from({ length: Math.min(MAX_IDLE_GAMES, count || UNKNOWN_SKELETON_ROWS) }, (_, index) => index);

  return (
    <div className="flex flex-col gap-6 appear-delayed" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-col">
        <div className="flex h-8 items-center border-b">
          <Skeleton className="h-3 w-24" />
        </div>
        {rows.map((row) => (
          <div key={row} className="flex h-9 items-center justify-between gap-8 border-b">
            <Skeleton className="h-4 w-full max-w-xs" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
