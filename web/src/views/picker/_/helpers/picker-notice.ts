import type { SelectionLock } from '@/types/selection-lock';
import type { PickerNoticeKind } from '../types/picker-notice';

export function pickerNotice(lock: SelectionLock | null, full: boolean): PickerNoticeKind | null {
  if (lock) return lock;
  if (full) return 'full';
  return null;
}
