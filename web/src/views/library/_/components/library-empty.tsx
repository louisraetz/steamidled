import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { SOURCE_FILTERS } from '../constants/source-filters';
import type { SourceFilter } from '../types/source-filter';

interface LibraryEmptyProps {
  query: string;
  filter: SourceFilter;
  onClearSearch: () => void;
  onClearFilters: () => void;
}

export function LibraryEmpty({ query, filter, onClearSearch, onClearFilters }: LibraryEmptyProps) {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    const label = SOURCE_FILTERS.find((option) => option.value === filter)?.emptyLabel;
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{label}</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClearFilters}>
            Show all games
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  if (filter !== 'all') {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No matches for “{trimmed}”</EmptyTitle>
          <EmptyDescription>Search covers game names only.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No matches for “{trimmed}”</EmptyTitle>
        <EmptyDescription>Search covers game names only.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onClearSearch}>
          Clear search
        </Button>
      </EmptyContent>
    </Empty>
  );
}
