import { useConnectionStore } from '@/stores/connection-store';

export function useCanMutate(): boolean {
  return useConnectionStore((state) => state.status !== 'reconnecting');
}
