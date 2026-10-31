import type { LogItem } from '../types/log-item';
import { DaySeparator } from './day-separator';
import { LogRow } from './log-row';

export function LogListItem({ item }: { item: LogItem }) {
  if (item.kind === 'day') return <DaySeparator label={item.label} />;
  return <LogRow entry={item.entry} />;
}
