import { useMemo, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useSnapshotCache } from '@/hooks/use-snapshot';
import { useStableCallback } from '@/hooks/use-stable-callback';
import type { ScheduleSettings } from '@/lib/settings';
import { RANGE_BY_KEY } from '../constants/schedule';
import { SAVE_DEBOUNCE_MS } from '../constants/settings';
import { isSavedRange, rangePatch, sameRange, savedRange, toFormValues } from '../helpers/schedule-form';
import { scheduleFormSchema } from '../schemas/schedule-schema';
import type { RangeKey, ScheduleFormValues } from '../types/schedule-form';
import { useSavedFlash } from './use-saved-flash';
import { useSettingsMutation } from './use-settings-mutation';

export function useScheduleForm() {
  const schedule = useDaemonState((snapshot) => snapshot.settings.schedule);
  const values = useMemo(() => schedule && toFormValues(schedule), [schedule]);
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

  const resetPair = (key: RangeKey, source: ScheduleSettings) => {
    const pair = savedRange(RANGE_BY_KEY[key], source);
    form.resetField(`${key}.min`, { defaultValue: pair.min });
    form.resetField(`${key}.max`, { defaultValue: pair.max });
  };

  const save = useStableCallback(async (key: RangeKey) => {
    const range = RANGE_BY_KEY[key];
    if (!schedule || !(await form.trigger(key))) return;
    const pair = form.getValues(key);
    if (isSavedRange(range, pair, schedule)) return;
    mutation.mutate(
      { schedule: rangePatch(range, pair) },
      {
        onSuccess: (snapshot) => {
          if (sameRange(form.getValues(key), pair)) resetPair(key, snapshot.settings.schedule);
          saved.flash(key);
        },
        onError: () => {
          const current = cache.read()?.settings.schedule;
          if (current) resetPair(key, current);
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
