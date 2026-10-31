import { MAX_IDLE_GAMES } from '@/lib/constants';
import { pluralize } from '@/lib/format';

import type { SelectionActionsKind } from '../types/selection-actions-kind';

export function selectionSuffix(count: number, changes: number): string {
  if (count >= MAX_IDLE_GAMES) return ' · limit reached';
  if (changes > 0) return ` · ${changes} ${pluralize(changes, 'change')}`;
  return '';
}

export function selectionActionsKind(running: boolean, changes: number, connected: boolean): SelectionActionsKind {
  if (!running) return 'start';
  if (changes === 0) return 'none';
  if (!connected) return 'blocked';
  return 'apply';
}
