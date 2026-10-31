import { cn } from '@/lib/utils';
import { toneClass } from '@/components/tone';
import { STATUS } from '../constants/status';
import type { DisplayStatus } from '../types/game-display';

interface StatusLabelProps {
  status: DisplayStatus;
  detail?: string;
  detailClassName?: string;
}

export function StatusLabel({ status, detail = '', detailClassName }: StatusLabelProps) {
  const { icon: Icon, label, tone } = STATUS[status];
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 align-middle">
      <Icon className={cn('size-4 shrink-0', toneClass[tone])} />
      <span className={toneClass[tone]}>{label}</span>
      <span className={cn('truncate text-muted-foreground', detailClassName)}>{detail}</span>
    </span>
  );
}
