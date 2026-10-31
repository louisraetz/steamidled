import { Skeleton } from '@/components/ui/skeleton';
import { BOOT_SKELETON_ROWS } from '../constants/skeleton';

export function BootSkeleton() {
  return (
    <div className="appear-delayed">
      <div className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="hidden h-4 w-64 sm:block" />
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-48" />
        <div className="mt-4 flex flex-col">
          {BOOT_SKELETON_ROWS.map((row) => (
            <div key={row} className="flex h-9 items-center border-b">
              <Skeleton className="h-4 w-full max-w-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
