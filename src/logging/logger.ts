import { EventEmitter } from 'node:events';
import { IS_HEADLESS, LOG_BUFFER_SIZE } from '../constants.js';
import type { LogEntry, LogLevel } from '../web/types.js';

export type LogScope = 'steam' | 'idle' | 'web' | 'telegram' | 'storage' | 'login';

export interface LogOptions {
  hint?: string;
  cause?: unknown;
  interactive?: () => void;
}

export const logEvents = new EventEmitter();
logEvents.setMaxListeners(0);

const entries: LogEntry[] = [];
let nextEntryId = 1;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatTimestamp(time: number): string {
  const date = new Date(time);
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${day} ${clock}`;
}

function describeCause(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return String(cause);
}

function withPeriod(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function formatLine(
  time: number,
  level: LogLevel,
  scope: LogScope,
  message: string,
  hint: string | null,
  cause: string | null
): string {
  const head = `${formatTimestamp(time)} ${level.toUpperCase().padEnd(5)} [${scope}]`;
  const body = hint ? `${withPeriod(message)} Fix: ${hint}` : message;
  const tail = cause ? ` (cause: ${cause})` : '';
  return `${head} ${body}${tail}`;
}

function write(level: LogLevel, scope: LogScope, message: string, options: LogOptions = {}): LogEntry {
  const time = Date.now();
  const hint = options.hint ?? null;
  const cause = options.cause === undefined ? null : describeCause(options.cause);
  const entry: LogEntry = {
    id: nextEntryId++,
    time,
    level,
    scope,
    message: cause ? `${message} (cause: ${cause})` : message,
    hint,
  };
  entries.push(entry);
  if (entries.length > LOG_BUFFER_SIZE) entries.splice(0, entries.length - LOG_BUFFER_SIZE);

  if (IS_HEADLESS) {
    const line = `${formatLine(time, level, scope, message, hint, cause)}\n`;
    if (level === 'info') process.stdout.write(line);
    else process.stderr.write(line);
  } else {
    options.interactive?.();
  }

  logEvents.emit('entry', entry);
  return entry;
}

export const log = {
  info: (scope: LogScope, message: string, options?: LogOptions): LogEntry =>
    write('info', scope, message, options),
  warn: (scope: LogScope, message: string, options?: LogOptions): LogEntry =>
    write('warn', scope, message, options),
  error: (scope: LogScope, message: string, options?: LogOptions): LogEntry =>
    write('error', scope, message, options),
};

export function getLogEntries(): LogEntry[] {
  return entries.slice();
}
