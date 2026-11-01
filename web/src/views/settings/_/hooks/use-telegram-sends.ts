import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';

export function useTelegramSends() {
  const test = useSnapshotMutation(() => api.telegramTest(), {
    errorPrefix: "Couldn't send the test message.",
    onSuccess: () => toast.success('Test message sent. Check Telegram.'),
  });
  const report = useSnapshotMutation(() => api.telegramReport(), {
    errorPrefix: "Couldn't send the report.",
    onSuccess: () => toast.success('Report sent. Check Telegram.'),
  });
  return { test, report };
}
