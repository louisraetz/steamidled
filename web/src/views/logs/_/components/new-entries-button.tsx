import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pluralize } from '@/lib/format';

export function NewEntriesButton({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <Button
        variant="outline"
        size="sm"
        className="pointer-events-auto animate-in fade-in-0 duration-150"
        onClick={onClick}
      >
        <ArrowDown />
        {count} new {pluralize(count, 'entry', 'entries')}
      </Button>
    </div>
  );
}
