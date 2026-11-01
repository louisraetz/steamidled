import { useMemo } from 'react';
import { EMPTY_IDS, MAX_IDLE_GAMES } from '@/lib/constants';
import { selectionOf, withGame, withoutGame } from '@/lib/selection';
import { updateSelection } from '@/lib/selection-sync';
import { useDaemonState } from './use-daemon-state';
import { useSelectionLock } from './use-selection-lock';

export function useSelection() {
  const selected = useDaemonState(selectionOf) ?? EMPTY_IDS;
  const lock = useSelectionLock();
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const locked = lock !== null;

  const toggle = (appid: number) => {
    if (locked) return;
    updateSelection((appIds) => (appIds.includes(appid) ? withoutGame(appIds, appid) : withGame(appIds, appid)));
  };

  return { selected, selectedSet, full: selected.length >= MAX_IDLE_GAMES, lock, locked, toggle };
}
