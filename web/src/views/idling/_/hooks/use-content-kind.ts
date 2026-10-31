import { useDaemonState } from '@/hooks/use-daemon-state';
import type { IdlingContentKind } from '../types/idling-content-kind';

export function useContentKind(gameCount: number): IdlingContentKind {
  const phase = useDaemonState((snapshot) => snapshot.phase);
  if (phase === 'signing-in' || phase === 'loading-library') return 'loading';
  if (gameCount > 0) return 'games';
  if (phase === 'ready') return 'empty';
  return 'none';
}
