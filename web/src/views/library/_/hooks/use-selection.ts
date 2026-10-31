import { useMemo } from 'react';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { EMPTY_IDS, MAX_IDLE_GAMES } from '@/lib/constants';
import { countChanges } from '../helpers/selection-diff';
import { usePendingSelectionStore } from '../stores/pending-selection-store';

export function useSelection() {
  const serverSelection = useDaemonState((snapshot) => snapshot.games.map((game) => game.appid)) ?? EMPTY_IDS;
  const accountName = useDaemonState((snapshot) => snapshot.accountName) ?? null;
  const draft = usePendingSelectionStore((state) => state.draft);
  const draftAccount = usePendingSelectionStore((state) => state.accountName);
  const effectiveDraft = draft && draftAccount === accountName ? draft : null;
  const selected = effectiveDraft ?? serverSelection;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const changes = effectiveDraft ? countChanges(effectiveDraft, serverSelection) : 0;

  return {
    accountName,
    serverSelection,
    selected,
    selectedSet,
    changes,
    limitReached: selected.length >= MAX_IDLE_GAMES,
    running: serverSelection.length > 0,
  };
}
