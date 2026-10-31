import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { DaemonSnapshot } from '@/lib/types';
import { useConnectionStore } from '@/stores/connection-store';

async function fetchState(): Promise<DaemonSnapshot> {
  const snapshot = await api.state();
  useConnectionStore.getState().syncClock(snapshot.serverTime);
  return snapshot;
}

export function useDaemonQuery() {
  return useQuery({ queryKey: queryKeys.state, queryFn: fetchState });
}

export function useDaemonState<T>(select: (snapshot: DaemonSnapshot) => T): T | undefined {
  return useQuery({ queryKey: queryKeys.state, queryFn: fetchState, select }).data;
}
