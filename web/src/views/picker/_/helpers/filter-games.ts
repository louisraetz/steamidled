import type { LibraryGame } from '@/lib/types';
import { NAME_COLLATOR } from '../constants/collator';
import type { FilteredGames } from '../types/filtered-games';
import type { SourceFilter } from '../types/source-filter';

function byName(a: LibraryGame, b: LibraryGame): number {
  return NAME_COLLATOR.compare(a.name, b.name);
}

export function filterGames(
  games: LibraryGame[],
  favoriteIds: ReadonlySet<number>,
  filter: SourceFilter,
  query: string
): FilteredGames {
  const needle = query.trim().toLowerCase();
  const matches = games.filter(
    (game) =>
      (filter === 'all' || game.source === filter) &&
      (needle.length === 0 || game.name.toLowerCase().includes(needle))
  );
  return {
    favorites: matches.filter((game) => favoriteIds.has(game.appid)).sort(byName),
    others: matches.filter((game) => !favoriteIds.has(game.appid)).sort(byName),
  };
}
