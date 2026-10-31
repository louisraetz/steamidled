import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { formatCount } from '@/lib/format';
import type { LogLevel } from '@/lib/types';

interface LogsEmptyProps {
  levels: LogLevel[];
  total: number;
  onShowAll: () => void;
}

export function LogsEmpty({ levels, total, onShowAll }: LogsEmptyProps) {
  if (levels.length === 1 && levels[0] === 'error') {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No errors in the last {formatCount(total)} entries.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Nothing matches these levels.</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onShowAll}>
          Show all levels
        </Button>
      </EmptyContent>
    </Empty>
  );
}
