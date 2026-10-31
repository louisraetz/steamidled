import { Button } from '@/components/ui/button';
import { useCopy } from '@/hooks/use-copy';
import type { LogEntry } from '@/lib/types';
import { COPY_VISIBLE_LABELS } from '../constants/copy';
import { formatLogLines } from '../helpers/format-log-line';

export function CopyVisibleButton({ entries }: { entries: LogEntry[] }) {
  const { copied, copy } = useCopy();
  const label = COPY_VISIBLE_LABELS[copied ? 'done' : 'idle'];
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={entries.length === 0}
      aria-live="polite"
      onClick={() => void copy(formatLogLines(entries))}
    >
      {label}
    </Button>
  );
}
