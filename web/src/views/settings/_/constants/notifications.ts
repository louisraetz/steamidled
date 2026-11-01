import { formatHourOfDay } from '@/lib/format';
import { REPORT_HOUR } from '@/lib/settings';
import type { TelegramNotifyPrefs } from '@/lib/types';
import type { SelectOption } from '../types/select-option';

export const NOTIFY_OPTIONS: readonly { key: keyof TelegramNotifyPrefs; label: string }[] = [
  { key: 'lifecycle', label: 'Started and stopped' },
  { key: 'pauseResume', label: 'Paused and resumed' },
  { key: 'flush', label: 'Playtime commits' },
  { key: 'zombie', label: 'Watchdog warnings' },
  { key: 'dailyReport', label: 'Daily report' },
];

export const REPORT_HOUR_OPTIONS: readonly SelectOption[] = Array.from(
  { length: REPORT_HOUR.max - REPORT_HOUR.min + 1 },
  (_, index) => {
    const hour = REPORT_HOUR.min + index;
    return { value: String(hour), label: formatHourOfDay(hour) };
  }
);

export const ALWAYS_SENT_NOTE = 'Problems that stop idling always come through.';
