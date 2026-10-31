import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useHotkey } from '@/hooks/use-hotkey';
import { useStableCallback } from '@/hooks/use-stable-callback';
import { EMPTY_IDS, MAX_IDLE_GAMES } from '@/lib/constants';
import type { LibraryGame } from '@/lib/types';
import { filterGames } from '../helpers/filter-games';
import { selectionActionsKind } from '../helpers/selection-summary';
import { usePendingSelectionStore } from '../stores/pending-selection-store';
import type { SourceFilter } from '../types/source-filter';
import { useApplySelection } from './use-apply-selection';
import { useExemptMutation } from './use-exempt-mutation';
import { useFavoriteMutation } from './use-favorite-mutation';
import { useSelection } from './use-selection';
import { useStopSelection } from './use-stop-selection';

export function useLibraryController(games: LibraryGame[]) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SourceFilter>('all');
  const favorites = useDaemonState((snapshot) => snapshot.favorites) ?? EMPTY_IDS;
  const exemptAppId = useDaemonState((snapshot) => snapshot.exemptAppId) ?? null;
  const connected = useDaemonState((snapshot) => snapshot.connection.state === 'connected') ?? false;
  const [groupFavorites, setGroupFavorites] = useState<ReadonlySet<number>>(() => new Set(favorites));
  const deferredQuery = useDeferredValue(query);
  const selection = useSelection();
  const canMutate = useCanMutate();
  const store = usePendingSelectionStore();
  const apply = useApplySelection();
  const favoriteMutation = useFavoriteMutation();
  const exemptMutation = useExemptMutation();
  const stop = useStopSelection();
  const [stopOpen, setStopOpen] = useState(false);
  const filtered = useMemo(
    () => filterGames(games, groupFavorites, filter, deferredQuery),
    [games, groupFavorites, filter, deferredQuery]
  );
  const favoriteIds = useMemo(() => new Set(favorites), [favorites]);

  useHotkey('/', () => searchRef.current?.focus());

  const changeQuery = (next: string) => {
    setQuery(next);
    setGroupFavorites(new Set(favorites));
  };
  const changeFilter = (next: SourceFilter) => {
    setFilter(next);
    setGroupFavorites(new Set(favorites));
  };

  const onToggleSelect = useStableCallback((appid: number) => {
    if (!canMutate) return;
    store.toggle(appid, selection.selected, selection.accountName);
  });

  const onToggleFavorite = useStableCallback((appid: number) => {
    if (!canMutate) return;
    favoriteMutation.mutate({ appId: appid, favorite: !favorites.includes(appid) });
  });

  const onToggleExempt = useStableCallback((appid: number) => {
    if (!canMutate) return;
    const nameOf = (id: number) => games.find((game) => game.appid === id)?.name ?? `App ${id}`;
    if (exemptAppId === appid) {
      exemptMutation.mutate({ appId: null, name: null, previous: null, announce: false });
      return;
    }
    const previous = exemptAppId === null ? null : { appId: exemptAppId, name: nameOf(exemptAppId) };
    exemptMutation.mutate({ appId: appid, name: nameOf(appid), previous, announce: true });
  });

  const onApply = () => {
    if (selection.running && selection.selected.length === 0) {
      setStopOpen(true);
      return;
    }
    apply.mutate([...selection.selected]);
  };

  const onSelectFavorites = () => {
    const inLibrary = favorites.filter((appid) => games.some((game) => game.appid === appid));
    store.replace(inLibrary, selection.accountName);
    if (inLibrary.length > MAX_IDLE_GAMES) {
      toast(`Selected the first ${MAX_IDLE_GAMES} favorites. Steam idles at most ${MAX_IDLE_GAMES} games.`);
    }
  };

  return {
    searchRef,
    query,
    filter,
    changeQuery,
    changeFilter,
    filtered,
    favoriteIds,
    favoritesAvailable: favorites.some((appid) => games.some((game) => game.appid === appid)),
    exemptAppId,
    selection,
    locked: !canMutate,
    actionsKind: selectionActionsKind(selection.running, selection.changes, connected),
    applyPending: apply.isPending || stop.isPending,
    onApply,
    stopDialog: {
      open: stopOpen,
      gameCount: selection.serverSelection.length,
      onOpenChange: setStopOpen,
      onConfirm: () => stop.mutate(),
    },
    onDiscard: store.discard,
    onSelectFavorites,
    onToggleSelect,
    onToggleFavorite,
    onToggleExempt,
  };
}
