import { useState } from 'react';
import { useLogs } from '@/hooks/use-logs';
import { EMPTY_LOGS } from '@/lib/constants';
import type { LogLevel } from '@/lib/types';
import { ALL_LEVELS } from '../constants/levels';

export function useLogsController() {
  const logs = useLogs();
  const [levels, setLevels] = useState<LogLevel[]>(ALL_LEVELS);
  const entries = logs.data ?? EMPTY_LOGS;
  const counts: Record<LogLevel, number> = { info: 0, warn: 0, error: 0 };
  for (const entry of entries) counts[entry.level] += 1;

  return {
    loading: logs.isPending,
    entries,
    visible: entries.filter((entry) => levels.includes(entry.level)),
    counts,
    levels,
    setLevels,
    showAll: () => setLevels(ALL_LEVELS),
  };
}
