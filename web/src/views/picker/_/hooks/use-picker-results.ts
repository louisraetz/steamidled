import { useDeferredValue, useMemo, useState } from 'react';
import { useGamePreferences } from '@/hooks/use-game-preferences';
import { useSelection } from '@/hooks/use-selection';
import { useStableCallback } from '@/hooks/use-stable-callback';
import type { LibraryGame } from '@/lib/types';
import { filterGames } from '../helpers/filter-games';
import { pickerNotice } from '../helpers/picker-notice';
import type { PickerSheet } from '../types/picker-sheet';
import { useRovingList } from './use-roving-list';

export function usePickerResults(games: LibraryGame[], sheet: PickerSheet) {
  const preferences = useGamePreferences();
  const selection = useSelection();
  const query = useDeferredValue(sheet.query);
  const groupKey = `${sheet.filter}:${query}`;
  const [grouping, setGrouping] = useState(() => ({ key: groupKey, favorites: new Set(preferences.favorites) }));
  if (grouping.key !== groupKey) setGrouping({ key: groupKey, favorites: new Set(preferences.favorites) });

  const filtered = useMemo(
    () => filterGames(games, grouping.favorites, sheet.filter, query),
    [games, grouping.favorites, sheet.filter, query]
  );
  const ordered = useMemo(() => [...filtered.favorites, ...filtered.others], [filtered]);
  const roving = useRovingList({
    listRef: sheet.listRef,
    count: ordered.length,
    onFavorite: (index) => preferences.toggleFavorite(ordered[index].appid),
    onExempt: (index) => preferences.toggleExempt(ordered[index].appid),
    onLeaveTop: () => sheet.searchRef.current?.focus(),
  });
  const toggleGame = useStableCallback(selection.toggle);

  return {
    filtered,
    empty: ordered.length === 0,
    roving,
    selection,
    favoriteIds: useMemo(() => new Set(preferences.favorites), [preferences.favorites]),
    exemptAppId: preferences.exemptAppId,
    notice: pickerNotice(selection.lock, selection.full),
    toggleGame,
  };
}
