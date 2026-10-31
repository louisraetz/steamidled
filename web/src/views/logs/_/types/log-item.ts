import type { LogEntry } from '@/lib/types';

export type LogItem = { kind: 'day'; key: string; label: string } | { kind: 'entry'; key: string; entry: LogEntry };
