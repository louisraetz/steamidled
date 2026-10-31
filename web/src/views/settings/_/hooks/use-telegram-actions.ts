import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSnapshotCache } from '@/hooks/use-snapshot';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';

export function useTelegramActions(onTokenAccepted: () => void) {
  const cache = useSnapshotCache();
  const submitToken = useMutation({
    mutationFn: (token: string) => api.telegramToken(token),
    onSuccess: (snapshot) => {
      cache.write(snapshot);
      onTokenAccepted();
    },
  });
  const disable = useSnapshotMutation(() => api.telegramDisable(), {
    errorPrefix: "Couldn't change the Telegram settings.",
  });
  return { submitToken, disable };
}
