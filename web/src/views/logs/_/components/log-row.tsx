import { memo } from 'react';
import { formatLogClock } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { LogEntry } from '@/lib/types';
import { LEVEL_TAG } from '../constants/levels';
import { formatLogLine } from '../helpers/format-log-line';
import { CopyEntryButton } from './copy-entry-button';
import { LogHint } from './log-hint';

export const LogRow = memo(function LogRow({ entry }: { entry: LogEntry }) {
  const tag = LEVEL_TAG[entry.level];
  return (
    <div
      data-level={entry.level}
      className="group/log flex items-start gap-3 px-2 py-1 font-mono text-xs data-[level=error]:bg-destructive-tint"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:gap-3">
        <div className="flex shrink-0 gap-3">
          <time dateTime={new Date(entry.time).toISOString()} className="w-16 text-tertiary">
            {formatLogClock(entry.time)}
          </time>
          <span className={cn('w-10', tag.className)}>{tag.text}</span>
          <span className="w-16 truncate text-muted-foreground">{entry.scope}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words whitespace-pre-wrap">{entry.message}</p>
          <LogHint hint={entry.hint} />
        </div>
      </div>
      <CopyEntryButton text={formatLogLine(entry)} />
    </div>
  );
});
