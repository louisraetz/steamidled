import { cn } from '@/lib/utils';
import { GroupLabel } from './group-label';

interface GroupHeadingProps {
  title: string;
  count: number;
  description?: string;
  className?: string;
}

export function GroupHeading({ title, count, description, className }: GroupHeadingProps) {
  return (
    <h2 className={cn('flex h-9 items-end gap-2 border-b pb-1 text-sm font-semibold text-muted-foreground', className)}>
      <GroupLabel title={title} count={count} />
      <span className="min-w-0 truncate font-normal text-tertiary">{description}</span>
    </h2>
  );
}
