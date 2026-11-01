import { cn } from '@/lib/utils';
import { CHART_SAMPLE_LABEL } from '../constants/cycle-chart';
import { CHART_LEGEND } from '../constants/symbols';

export function CycleLegend() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {CHART_LEGEND.map(({ icon: Icon, className, label }) => (
          <li key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Icon className={cn('size-5 shrink-0', className)} />
            {label}
          </li>
        ))}
      </ul>
      <span className="text-sm text-tertiary">{CHART_SAMPLE_LABEL}</span>
    </div>
  );
}
