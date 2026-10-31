import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useLogs() {
  return useQuery({ queryKey: queryKeys.logs, queryFn: api.logs });
}
