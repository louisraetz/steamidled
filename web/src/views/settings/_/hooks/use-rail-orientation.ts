import { useIsDesktop } from '@/hooks/use-is-desktop';

export function useRailOrientation(): 'vertical' | 'horizontal' {
  return useIsDesktop() ? 'vertical' : 'horizontal';
}
