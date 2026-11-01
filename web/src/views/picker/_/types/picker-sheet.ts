import type { RefObject } from 'react';
import type { PickerDraft } from './picker-draft';
import type { SourceFilter } from './source-filter';

export interface PickerSheet {
  query: string;
  filter: SourceFilter;
  searchRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  draft: PickerDraft;
  changeQuery: (query: string) => void;
  changeFilter: (filter: SourceFilter) => void;
  focusList: () => void;
}
