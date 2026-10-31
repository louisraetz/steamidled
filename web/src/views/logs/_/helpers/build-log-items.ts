import { formatDay } from '@/lib/format';
import type { LogEntry } from '@/lib/types';
import type { LogItem } from '../types/log-item';

export function buildLogItems(entries: LogEntry[]): LogItem[] {
  const items: LogItem[] = [];
  let currentDay = '';
  for (const entry of entries) {
    const day = new Date(entry.time).toDateString();
    if (day !== currentDay) {
      currentDay = day;
      items.push({ kind: 'day', key: `day-${day}`, label: formatDay(entry.time) });
    }
    items.push({ kind: 'entry', key: `entry-${entry.id}`, entry });
  }
  return items;
}
