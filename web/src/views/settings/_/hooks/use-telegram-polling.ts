import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNow } from '@/hooks/use-now';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { TELEGRAM_POLL_MS, TELEGRAM_WAIT_LIMIT_MS } from '../constants/telegram';

export function useTelegramPolling() {
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const now = useNow();
  const timedOut = now - startedAt >= TELEGRAM_WAIT_LIMIT_MS;
  const query = useQuery({
    queryKey: queryKeys.telegramConfirm,
    queryFn: api.telegramConfirm,
    enabled: !timedOut,
    refetchInterval: TELEGRAM_POLL_MS,
    gcTime: 0,
  });

  return {
    timedOut,
    checking: query.isFetching,
    checkAgain: () => {
      setStartedAt(Date.now());
      void query.refetch();
    },
  };
}
