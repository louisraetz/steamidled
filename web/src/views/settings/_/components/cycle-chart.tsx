import type { UseFormReturn } from 'react-hook-form';
import { RichText } from '@/components/rich-text';
import { useCycleChart } from '../hooks/use-cycle-chart';
import type { ScheduleFormValues } from '../types/schedule-form';
import { CycleAxis } from './cycle-axis';
import { CycleLanes } from './cycle-lanes';
import { CycleLegend } from './cycle-legend';

interface CycleChartProps {
  form: UseFormReturn<ScheduleFormValues>;
  enabled: boolean;
  custom: boolean;
}

export function CycleChart({ form, enabled, custom }: CycleChartProps) {
  const chart = useCycleChart(form, enabled, custom);
  return (
    <figure className="flex flex-col gap-4">
      <CycleLegend />
      <div className="flex flex-col gap-2">
        <CycleLanes lanes={chart.lanes} />
        <CycleAxis />
      </div>
      <figcaption>
        <RichText parts={chart.caption} />
      </figcaption>
    </figure>
  );
}
