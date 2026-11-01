import { Skeleton } from '@/components/ui/skeleton';
import { SKELETON_PROFILE_TILES } from '../constants/skeleton';

export function SettingsPanelSkeleton() {
  return (
    <div className="flex max-w-4xl min-w-0 flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-6 w-full max-w-xs" />
      </div>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-64 max-w-full" />
          </div>
          <Skeleton className="h-6 w-11 shrink-0" />
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
          {SKELETON_PROFILE_TILES.map((tile) => (
            <Skeleton key={tile} className="h-28 rounded-lg md:h-32 lg:h-48" />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-full max-w-md" />
          <Skeleton className="h-48 w-full lg:h-56" />
        </div>
      </div>
    </div>
  );
}
