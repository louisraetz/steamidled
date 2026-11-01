import { Skeleton } from '@/components/ui/skeleton';
import { LOG_SKELETON_LINES } from '../constants/skeleton';

export function LogsSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-2 appear-delayed" aria-hidden="true">
      {LOG_SKELETON_LINES.map((line) => (
        <div key={line} className="flex gap-3">
          <Skeleton className="h-5 w-18" />
          <Skeleton className="h-5 w-11" />
          <Skeleton className="h-5 w-full max-w-md" />
        </div>
      ))}
    </div>
  );
}
