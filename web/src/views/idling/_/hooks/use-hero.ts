import { useDaemonState } from '@/hooks/use-daemon-state';
import { useSessionGain } from '@/hooks/use-session-gain';
import { describeGain, formatGain } from '@/lib/format';
import { allCoolingDown, nextIdleAt } from '../helpers/cooldown';
import { heroCaption } from '../helpers/hero-caption';

export function useHero() {
  const { gainedMs, todayMs, counting, now } = useSessionGain();
  const idlingSince = useDaemonState((snapshot) => snapshot.idlingSince) ?? null;
  const gameCount = useDaemonState((snapshot) => snapshot.games.length) ?? 0;
  const sleeping = useDaemonState(allCoolingDown) ?? false;
  const nextIdle = useDaemonState(nextIdleAt) ?? null;

  return {
    value: formatGain(gainedMs),
    label: `${describeGain(gainedMs)} collected this session`,
    sleeping,
    caption: heroCaption({ sleeping, gameCount, nextIdleAt: nextIdle, counting, idlingSince, todayMs, now }),
  };
}
