import { useDeferredValue, useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { cycleChartModel } from '../helpers/cycle-chart-model';
import { toCycleRanges } from '../helpers/cycle-input';
import type { CycleChartModel } from '../types/cycle-chart';
import type { ScheduleFormValues } from '../types/schedule-form';
import { useDisplayedHours } from './use-displayed-hours';

export function useCycleChart(
  form: UseFormReturn<ScheduleFormValues>,
  enabled: boolean,
  custom: boolean
): CycleChartModel {
  const hours = useDisplayedHours(form, custom);
  const ranges = useMemo(() => toCycleRanges(hours), [hours]);
  const deferred = useDeferredValue(ranges);
  return useMemo(() => cycleChartModel(deferred, enabled), [deferred, enabled]);
}
