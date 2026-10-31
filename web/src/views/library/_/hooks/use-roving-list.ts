import { useRef, useState, type KeyboardEvent } from 'react';
import { PAGE_STEP } from '../constants/keyboard';
import type { RovingActions } from '../types/roving-actions';

export function useRovingList({ count, onSelect, onFavorite, onExempt }: RovingActions) {
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const focusRow = (index: number) => {
    const next = Math.max(0, Math.min(count - 1, index));
    setFocusedIndex(next);
    listRef.current?.querySelector<HTMLElement>(`[data-row-index="${next}"]`)?.focus();
  };

  const actions: Record<string, (index: number) => void> = {
    ArrowDown: (index) => focusRow(index + 1),
    ArrowUp: (index) => focusRow(index - 1),
    PageDown: (index) => focusRow(index + PAGE_STEP),
    PageUp: (index) => focusRow(index - PAGE_STEP),
    Home: () => focusRow(0),
    End: () => focusRow(count - 1),
    ' ': onSelect,
    f: onFavorite,
    F: onFavorite,
    x: onExempt,
    X: onExempt,
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const row = (event.target as HTMLElement).dataset.rowIndex;
    const action = actions[event.key];
    if (row === undefined || !action || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    action(Number(row));
  };

  return {
    listRef,
    focusedIndex: Math.min(focusedIndex, Math.max(0, count - 1)),
    setFocusedIndex,
    onKeyDown,
  };
}
