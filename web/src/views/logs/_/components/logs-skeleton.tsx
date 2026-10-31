import { Skeleton } from '@/components/ui/skeleton';
import { LOG_SKELETON_LINES } from '../constants/skeleton';

export function LogsSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-2 appear-delayed" aria-hidden="true">
      {LOG_SKELETON_LINES.map((line) => (
        <div key={line} className="flex gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      ))}
    </div>
  );
}
