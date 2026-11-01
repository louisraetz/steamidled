import { countingGames, sessionGainMs, todayGainMs } from '@/lib/session-gain';
import { useDaemonState } from './use-daemon-state';
import { useMinuteNow } from './use-minute-now';

export function useSessionGain() {
  const now = useMinuteNow();
  const gainedMs = useDaemonState((snapshot) => sessionGainMs(snapshot, now)) ?? 0;
  const todayMs = useDaemonState((snapshot) => todayGainMs(snapshot, now)) ?? null;
  const counting = useDaemonState(countingGames) ?? 0;
  return { gainedMs, todayMs, counting, now };
}
