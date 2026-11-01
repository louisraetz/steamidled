import type { RefObject } from 'react';
import type { SourceFilter } from './source-filter';

export interface PickerSheet {
  query: string;
  filter: SourceFilter;
  searchRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  changeQuery: (query: string) => void;
  changeFilter: (filter: SourceFilter) => void;
  focusList: () => void;
}
