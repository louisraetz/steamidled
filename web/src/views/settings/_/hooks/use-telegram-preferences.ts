import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { TelegramNotifyPrefs } from '@/lib/types';
import { useOptimisticSnapshotMutation } from '@/hooks/use-optimistic-snapshot-mutation';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';

export function useTelegramPreferences() {
  const notify = useOptimisticSnapshotMutation({
    mutationFn: (prefs: Partial<TelegramNotifyPrefs>) => api.telegramNotify(prefs),
    select: (snapshot) => snapshot.telegram.notify,
    merge: (snapshot, prefs) => ({ ...snapshot, telegram: { ...snapshot.telegram, notify: prefs } }),
    apply: (prefs, change) => ({ ...prefs, ...change }),
    errorPrefix: "Couldn't save the notification setting.",
  });
  const test = useSnapshotMutation(() => api.telegramTest(), {
    errorPrefix: "Couldn't send the test message.",
    onSuccess: () => toast.success('Test message sent. Check Telegram.'),
  });
  const report = useSnapshotMutation(() => api.telegramReport(), {
    errorPrefix: "Couldn't send the report.",
    onSuccess: () => toast.success('Report sent. Check Telegram.'),
  });
  return { notify, test, report };
}
