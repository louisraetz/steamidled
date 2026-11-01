import { cn } from '@/lib/utils';
import type { HOW_IT_WORKS } from '../constants/symbols';

export function HowItWorksRow({ row }: { row: (typeof HOW_IT_WORKS)[number] }) {
  const Icon = row.icon;
  return (
    <div className="flex gap-3">
      <Icon className={cn('mt-0.5 size-5 shrink-0', row.className)} />
      <div className="flex min-w-0 flex-col">
        <dt className="font-semibold">{row.label}</dt>
        <dd className="text-muted-foreground">{row.description}</dd>
      </div>
    </div>
  );
}
