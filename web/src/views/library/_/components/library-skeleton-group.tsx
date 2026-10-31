import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function LibrarySkeletonGroup({ rows }: { rows: { id: number; className: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col">
      <div className="flex h-8 items-end border-b pb-1">
        <Skeleton className="h-3 w-20" />
      </div>
      {rows.map((row) => (
        <div key={row.id} className={cn('h-9 items-center gap-3 border-b', row.className)}>
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-full max-w-xs" />
        </div>
      ))}
    </div>
  );
}
