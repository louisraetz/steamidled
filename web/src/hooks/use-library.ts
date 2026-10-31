import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useDaemonState } from './use-daemon-state';

export function useLibrary() {
  const libraryLoaded = useDaemonState((snapshot) => snapshot.libraryLoaded) ?? false;
  return useQuery({ queryKey: queryKeys.library, queryFn: api.library, enabled: libraryLoaded });
}
