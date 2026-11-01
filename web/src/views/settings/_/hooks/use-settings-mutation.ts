import { api } from '@/lib/api';
import { mergeSettings, type SettingsPatch } from '@/lib/settings';
import { useOptimisticSnapshotMutation } from '@/hooks/use-optimistic-snapshot-mutation';
import { SETTINGS_SAVE_ERROR } from '../constants/settings';

export function useSettingsMutation() {
  return useOptimisticSnapshotMutation({
    mutationFn: (patch: SettingsPatch) => api.updateSettings(patch),
    select: (snapshot) => snapshot.settings,
    merge: (snapshot, settings) => ({ ...snapshot, settings }),
    apply: mergeSettings,
    errorPrefix: SETTINGS_SAVE_ERROR,
  });
}
