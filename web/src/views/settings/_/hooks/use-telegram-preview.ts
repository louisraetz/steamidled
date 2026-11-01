import { useDaemonState } from '@/hooks/use-daemon-state';
import { useMinuteNow } from '@/hooks/use-minute-now';
import { telegramPreview, telegramTeaser } from '../helpers/telegram-preview';

export function useTelegramPreview() {
  const now = useMinuteNow();
  return useDaemonState((snapshot) => telegramPreview(snapshot, now));
}

export function useTelegramTeaser() {
  const now = useMinuteNow();
  return useDaemonState((snapshot) => telegramTeaser(snapshot, now)) ?? [];
}
