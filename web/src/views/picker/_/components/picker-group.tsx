import type { ReactNode } from 'react';
import { GroupHeading } from '@/components/group-heading';

interface PickerGroupProps {
  title: string;
  description: string | undefined;
  count: number;
  children: ReactNode;
}

export function PickerGroup({ title, description, count, children }: PickerGroupProps) {
  if (count === 0) return null;
  return (
    <section aria-label={title} className="-mx-2 flex flex-col">
      <GroupHeading title={title} count={count} description={description} className="px-2" />
      <div role="list">{children}</div>
    </section>
  );
}
