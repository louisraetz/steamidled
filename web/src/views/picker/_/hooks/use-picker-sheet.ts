import { useEffect, useRef, useState } from 'react';
import { usePickerStore } from '@/stores/picker-store';
import { TOASTER_SELECTOR } from '../constants/picker';
import { focusOpener } from '../helpers/focus-opener';
import type { PickerSheet } from '../types/picker-sheet';
import type { SourceFilter } from '../types/source-filter';

export function usePickerSheet() {
  const open = usePickerStore((state) => state.open);
  const opener = usePickerStore((state) => state.opener);
  const setOpen = usePickerStore((state) => state.setOpen);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SourceFilter>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => setOpen(false), [setOpen]);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next) return;
    setQuery('');
    setFilter('all');
  };

  const onEscapeKeyDown = (event: KeyboardEvent) => {
    if (query.length === 0) return;
    event.preventDefault();
    setQuery('');
    searchRef.current?.focus();
  };

  const onInteractOutside = (event: Event) => {
    if (event.target instanceof Element && event.target.closest(TOASTER_SELECTOR)) event.preventDefault();
  };

  const onCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    focusOpener(opener);
  };

  const sheet: PickerSheet = {
    query,
    filter,
    searchRef,
    listRef,
    changeQuery: setQuery,
    changeFilter: setFilter,
    focusList: () => listRef.current?.querySelector<HTMLElement>('[data-row-index][tabindex="0"]')?.focus(),
  };

  return { open, changeOpen, onEscapeKeyDown, onInteractOutside, onCloseAutoFocus, sheet };
}
