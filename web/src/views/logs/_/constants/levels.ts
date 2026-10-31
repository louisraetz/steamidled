import type { LogLevel } from '@/lib/types';

export const LEVELS: { value: LogLevel; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warnings' },
  { value: 'error', label: 'Errors' },
];

export const ALL_LEVELS: LogLevel[] = LEVELS.map((level) => level.value);

export const LEVEL_TAG: Record<LogLevel, { text: string; className: string }> = {
  info: { text: 'INFO', className: 'text-tertiary' },
  warn: { text: 'WARN', className: 'font-semibold text-warning' },
  error: { text: 'ERROR', className: 'font-semibold text-destructive' },
};
