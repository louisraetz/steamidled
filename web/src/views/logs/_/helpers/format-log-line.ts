import type { LogEntry } from '@/lib/types';
import { LEVEL_TAG } from '../constants/levels';

export function formatLogLine(entry: LogEntry): string {
  const line = `${new Date(entry.time).toISOString()} ${LEVEL_TAG[entry.level].text} [${entry.scope}] ${entry.message}`;
  if (!entry.hint) return line;
  return `${line}\nFix: ${entry.hint}`;
}

export function formatLogLines(entries: LogEntry[]): string {
  return entries.map(formatLogLine).join('\n');
}
