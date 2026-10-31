import type { SourceFilter } from '../types/source-filter';

export const SOURCE_FILTERS: { value: SourceFilter; label: string; emptyLabel: string }[] = [
  { value: 'all', label: 'All', emptyLabel: '' },
  { value: 'owned', label: 'Owned', emptyLabel: 'No owned games in this library' },
  { value: 'free', label: 'Free', emptyLabel: 'No free games in this library' },
  { value: 'shared', label: 'Family', emptyLabel: 'No family games in this library' },
];
