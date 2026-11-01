import { toast } from 'sonner';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useSnapshotCache } from '@/hooks/use-snapshot';
import { DEFAULT_SCHEDULE_PROFILE, SCHEDULE_PROFILES, type SettingsPatch } from '@/lib/settings';
import type { DaemonSnapshot } from '@/lib/types';
import { customBase } from '../helpers/schedule-profile';
import { pickProfile } from '../helpers/toggle-values';
import { useSettingsMutation } from './use-settings-mutation';

function customPatch(snapshot: DaemonSnapshot): SettingsPatch {
  return { schedule: { ...customBase(snapshot), profile: 'custom' } };
}

export function useScheduleProfile(enabled: boolean) {
  const selected = useDaemonState((snapshot) => snapshot.settings.schedule.profile) ?? DEFAULT_SCHEDULE_PROFILE;
  const cache = useSnapshotCache();
  const mutation = useSettingsMutation();

  const select = (value: string) => {
    const next = pickProfile(value);
    const snapshot = cache.read();
    if (!enabled || !next || !snapshot || next === selected) return;
    if (next === 'custom') {
      mutation.mutate(customPatch(snapshot));
      return;
    }
    const { label } = SCHEDULE_PROFILES[next];
    mutation.mutate(
      { schedule: { profile: next } },
      { onSuccess: () => toast.success(`All games now follow ${label}.`) }
    );
  };

  return { selected, custom: selected === 'custom', select };
}
