import type { IdlingGameSnapshot, LibraryGame } from '@/lib/types';

export interface PlaceholderSources {
  library: LibraryGame[];
  known: ReadonlyMap<number, IdlingGameSnapshot>;
}
