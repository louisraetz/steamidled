import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function LibrarySkeletonGroup({ rows }: { rows: { id: number; className: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="-mx-2 flex flex-col">
      <div className="flex h-9 items-end border-b px-2 pb-1">
        <Skeleton className="h-4 w-24" />
      </div>
      {rows.map((row) => (
        <div key={row.id} className={cn('h-12 items-center gap-3 border-b px-2', row.className)}>
          <Skeleton className="h-9 w-24 shrink-0 rounded-sm sm:h-10.5 sm:w-28" />
          <Skeleton className="h-5 w-full max-w-xs" />
          <Skeleton className="ml-auto h-8 w-28 shrink-0" />
        </div>
      ))}
    </div>
  );
}
