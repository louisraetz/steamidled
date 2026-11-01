import type { ExternalToast } from 'sonner';
import { PICKER_TOASTER_ID } from '@/lib/constants';
import { usePickerStore } from '@/stores/picker-store';

export function toastTarget(): ExternalToast {
  return usePickerStore.getState().open ? { toasterId: PICKER_TOASTER_ID } : {};
}
