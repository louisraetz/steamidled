import type { ReactNode } from 'react';
import { formatCount } from '@/lib/format';

interface LibraryGroupProps {
  title: string;
  count: number;
  children: ReactNode;
}

export function LibraryGroup({ title, count, children }: LibraryGroupProps) {
  if (count === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col">
      <h2 className="flex h-8 items-end gap-2 border-b pb-1 text-xs font-semibold text-muted-foreground">
        {title}
        <span className="font-mono font-normal text-tertiary">{formatCount(count)}</span>
      </h2>
      <div role="list">{children}</div>
    </section>
  );
}
