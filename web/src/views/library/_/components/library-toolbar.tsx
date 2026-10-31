import type { RefObject } from 'react';
import { Search } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatCount } from '@/lib/format';
import { SOURCE_FILTERS } from '../constants/source-filters';
import type { SourceFilter } from '../types/source-filter';

interface LibraryToolbarProps {
  searchRef: RefObject<HTMLInputElement | null>;
  query: string;
  filter: SourceFilter;
  total: number;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: SourceFilter) => void;
}

export function LibraryToolbar({ searchRef, query, filter, total, onQueryChange, onFilterChange }: LibraryToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <InputGroup className="lg:max-w-sm">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchRef}
          type="search"
          aria-label="Search games"
          placeholder={`Search ${formatCount(total)} games`}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onQueryChange('');
          }}
        />
        <InputGroupAddon align="inline-end" className="hidden lg:flex">
          <Kbd>/</Kbd>
        </InputGroupAddon>
      </InputGroup>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        aria-label="Filter by source"
        value={filter}
        onValueChange={(value) => {
          if (value) onFilterChange(value as SourceFilter);
        }}
        className="w-full lg:w-fit"
      >
        {SOURCE_FILTERS.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className="flex-1 lg:flex-none">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
