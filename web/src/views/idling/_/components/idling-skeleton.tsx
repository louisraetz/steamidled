import { Skeleton } from '@/components/ui/skeleton';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { MAX_IDLE_GAMES } from '@/lib/constants';
import { UNKNOWN_SKELETON_ROWS } from '../constants/skeleton';

export function IdlingSkeleton() {
  const count = useDaemonState((snapshot) => snapshot.favorites.length) ?? 0;
  const rows = Array.from({ length: Math.min(MAX_IDLE_GAMES, count || UNKNOWN_SKELETON_ROWS) }, (_, index) => index);

  return (
    <div className="flex flex-col gap-8 appear-delayed" aria-hidden="true">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-12 w-52 sm:h-15 sm:w-64 lg:h-18 lg:w-80" />
        <Skeleton className="h-5 w-80 max-w-full" />
        <Skeleton className="h-11 w-56 sm:hidden" />
      </div>
      <div className="flex flex-col">
        <div className="hidden h-9 items-center border-b sm:flex">
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex h-9 items-end border-b pb-1">
          <Skeleton className="h-4 w-28" />
        </div>
        {rows.map((row) => (
          <div key={row} className="flex h-26 items-start gap-3 border-b py-2 sm:h-14 sm:items-center sm:py-0">
            <Skeleton className="h-9 w-24 shrink-0 rounded-sm sm:h-10.5 sm:w-28" />
            <Skeleton className="h-5 w-full max-w-xs" />
            <Skeleton className="ml-auto h-5 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
