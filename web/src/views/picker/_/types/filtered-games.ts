import type { LibraryGame } from '@/lib/types';

export interface FilteredGames {
  favorites: LibraryGame[];
  others: LibraryGame[];
}
