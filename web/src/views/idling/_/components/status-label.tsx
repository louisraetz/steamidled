import { cn } from '@/lib/utils';
import { toneClass } from '@/components/tone';
import { STATUS } from '../constants/status';
import type { DisplayStatus } from '../types/game-display';

interface StatusLabelProps {
  status: DisplayStatus;
  detail?: string;
}

export function StatusLabel({ status, detail = '' }: StatusLabelProps) {
  const { icon: Icon, label, tone } = STATUS[status];
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 align-middle">
      <Icon className={cn('size-5 shrink-0', toneClass[tone])} />
      <span className={cn('shrink-0 whitespace-nowrap', toneClass[tone])}>{label}</span>
      <span className="truncate text-muted-foreground">{detail}</span>
    </span>
  );
}
