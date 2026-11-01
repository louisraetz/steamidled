import { useMemo, useRef } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { DEFAULT_RANGES } from '../constants/schedule';
import { holdValidHours, initialHours } from '../helpers/cycle-input';
import { customBase } from '../helpers/schedule-profile';
import type { HoursByRange, ScheduleFormValues } from '../types/schedule-form';

export function useDisplayedHours(form: UseFormReturn<ScheduleFormValues>, custom: boolean): HoursByRange {
  const values = useWatch({ control: form.control });
  const base = useDaemonState(customBase) ?? DEFAULT_RANGES;
  const effective = useDaemonState((snapshot) => snapshot.effectiveSchedule) ?? DEFAULT_RANGES;
  const held = useRef(initialHours(base));
  held.current = holdValidHours(held.current, values, base);
  const live = held.current;
  return useMemo(() => (custom ? live : initialHours(effective)), [custom, live, effective]);
}
