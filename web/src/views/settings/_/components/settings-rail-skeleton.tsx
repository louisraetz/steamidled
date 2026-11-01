import { Skeleton } from '@/components/ui/skeleton';
import { SKELETON_SECTIONS } from '../constants/skeleton';

export function SettingsRailSkeleton() {
  return (
    <>
      <Skeleton className="mb-8 h-13 w-full rounded-lg lg:hidden" />
      <div className="hidden w-60 shrink-0 flex-col gap-1 lg:flex">
        {SKELETON_SECTIONS.map((section) => (
          <div key={section} className="flex min-h-14 flex-col justify-center gap-1.5 px-3 py-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
    </>
  );
}
