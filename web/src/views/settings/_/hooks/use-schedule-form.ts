import { useMemo, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useSnapshotCache } from '@/hooks/use-snapshot';
import { useStableCallback } from '@/hooks/use-stable-callback';
import type { ScheduleRanges } from '@/lib/settings';
import { RANGE_BY_KEY } from '../constants/schedule';
import { SAVE_DEBOUNCE_MS } from '../constants/settings';
import { isSavedRange, rangePatch, sameRange, savedRange, toFormValues } from '../helpers/schedule-form';
import { customBase } from '../helpers/schedule-profile';
import { scheduleFormSchema } from '../schemas/schedule-schema';
import type { RangeKey, ScheduleFormValues } from '../types/schedule-form';
import { useSavedFlash } from './use-saved-flash';
import { useSettingsMutation } from './use-settings-mutation';

export function useScheduleForm() {
  const base = useDaemonState(customBase);
  const values = useMemo(() => base && toFormValues(base), [base]);
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    values,
    resetOptions: { keepDirtyValues: true, keepErrors: true },
    mode: 'onChange',
  });
  const cache = useSnapshotCache();
  const mutation = useSettingsMutation();
  const saved = useSavedFlash<RangeKey>();
  const timers = useRef<Partial<Record<RangeKey, ReturnType<typeof setTimeout>>>>({});

  const resetPair = (key: RangeKey, source: ScheduleRanges) => {
    const pair = savedRange(RANGE_BY_KEY[key], source);
    form.resetField(`${key}.min`, { defaultValue: pair.min });
    form.resetField(`${key}.max`, { defaultValue: pair.max });
  };

  const save = useStableCallback(async (key: RangeKey) => {
    if (!(await form.trigger(key))) return;
    const snapshot = cache.read();
    if (!snapshot) return;
    const range = RANGE_BY_KEY[key];
    const current = customBase(snapshot);
    const pair = form.getValues(key);
    const isCustom = snapshot.settings.schedule.profile === 'custom';
    if (isCustom && isSavedRange(range, pair, current)) return;
    mutation.mutate(
      { schedule: { ...current, ...rangePatch(range, pair), profile: 'custom' } },
      {
        onSuccess: (next) => {
          if (sameRange(form.getValues(key), pair)) resetPair(key, customBase(next));
          saved.flash(key);
        },
        onError: () => {
          const rolledBack = cache.read();
          if (rolledBack) resetPair(key, customBase(rolledBack));
        },
      }
    );
  });

  const queueSave = useStableCallback((key: RangeKey) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => void save(key), SAVE_DEBOUNCE_MS);
  });

  return { form, savedKey: saved.key, queueSave };
}
