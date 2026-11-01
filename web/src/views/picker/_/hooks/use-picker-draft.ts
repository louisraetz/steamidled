import { useMemo, useState } from 'react';
import { useSelection } from '@/hooks/use-selection';
import { useStableCallback } from '@/hooks/use-stable-callback';
import { MAX_IDLE_GAMES } from '@/lib/constants';
import { updateSelection } from '@/lib/selection-sync';
import { NO_DRAFT_CHANGES, draftSelection, toggleDraftGame } from '../helpers/draft-selection';
import type { DraftChanges } from '../types/draft-changes';

export function usePickerDraft() {
  const selection = useSelection();
  const [changes, setChanges] = useState<DraftChanges>(NO_DRAFT_CHANGES);
  const selected = useMemo(() => draftSelection(selection.selected, changes), [selection.selected, changes]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const added = selected.filter((appid) => !selection.selectedSet.has(appid)).length;
  const removed = selection.selected.filter((appid) => !selectedSet.has(appid)).length;
  const dirty = added + removed > 0;

  const toggle = useStableCallback((appid: number) => {
    if (selection.locked) return;
    setChanges((current) => toggleDraftGame(selection.selected, current, appid));
  });

  const reset = () => setChanges(NO_DRAFT_CHANGES);

  const apply = () => {
    if (selection.locked || !dirty) return false;
    updateSelection(() => selected);
    reset();
    return true;
  };

  return {
    selectedSet,
    count: selected.length,
    full: selected.length >= MAX_IDLE_GAMES,
    added,
    removed,
    dirty,
    lock: selection.lock,
    locked: selection.locked,
    toggle,
    reset,
    apply,
  };
}
