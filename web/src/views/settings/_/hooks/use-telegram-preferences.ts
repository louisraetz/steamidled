import { api } from '@/lib/api';
import type { TelegramNotifyPrefs } from '@/lib/types';
import { useOptimisticSnapshotMutation } from '@/hooks/use-optimistic-snapshot-mutation';

export function useTelegramPreferences() {
  return useOptimisticSnapshotMutation({
    mutationFn: (prefs: Partial<TelegramNotifyPrefs>) => api.telegramNotify(prefs),
    select: (snapshot) => snapshot.telegram.notify,
    merge: (snapshot, prefs) => ({ ...snapshot, telegram: { ...snapshot.telegram, notify: prefs } }),
    apply: (prefs, change) => ({ ...prefs, ...change }),
    errorPrefix: "Couldn't save the notification setting.",
  });
}
