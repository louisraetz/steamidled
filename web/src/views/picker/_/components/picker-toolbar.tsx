import { useLibrary } from '@/hooks/use-library';
import type { PickerSheet } from '../types/picker-sheet';
import { PickerSearch } from './picker-search';
import { SourceFilterGroup } from './source-filter-group';

export function PickerToolbar({ sheet }: { sheet: PickerSheet }) {
  const total = useLibrary().data?.length ?? 0;
  return (
    <div className="flex flex-col gap-3 px-4 sm:px-6">
      <PickerSearch sheet={sheet} total={total} />
      <SourceFilterGroup value={sheet.filter} onChange={sheet.changeFilter} />
    </div>
  );
}
