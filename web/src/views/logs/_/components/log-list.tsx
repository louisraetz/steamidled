import { ScrollArea } from '@/components/ui/scroll-area';
import type { LogEntry } from '@/lib/types';
import { buildLogItems } from '../helpers/build-log-items';
import { useLogTail } from '../hooks/use-log-tail';
import { BufferNotice } from './buffer-notice';
import { LogListItem } from './log-list-item';
import { NewEntriesButton } from './new-entries-button';

export function LogList({ entries, total }: { entries: LogEntry[]; total: number }) {
  const tail = useLogTail(entries);
  const items = buildLogItems(entries);

  return (
    <div className="relative -mx-2 min-h-0 flex-1">
      <ScrollArea className="h-full" viewportRef={tail.viewportRef} onViewportScroll={tail.onScroll}>
        <BufferNotice total={total} />
        {items.map((item) => (
          <LogListItem key={item.key} item={item} />
        ))}
      </ScrollArea>
      <NewEntriesButton count={tail.unseen} onClick={tail.jumpToEnd} />
    </div>
  );
}
