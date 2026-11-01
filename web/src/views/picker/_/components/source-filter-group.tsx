import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SOURCE_FILTERS } from '../constants/source-filters';
import type { SourceFilter } from '../types/source-filter';

export function SourceFilterGroup({ value, onChange }: { value: SourceFilter; onChange: (filter: SourceFilter) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-label="Filter by source"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as SourceFilter);
      }}
      className="w-full"
    >
      {SOURCE_FILTERS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className="flex-1">
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
