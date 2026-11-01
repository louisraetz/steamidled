import { useEffect, useRef, useState } from 'react';
import { usePickerStore } from '@/stores/picker-store';
import { TOASTER_SELECTOR } from '../constants/picker';
import { focusOpener } from '../helpers/focus-opener';
import type { PickerSheet } from '../types/picker-sheet';
import type { SourceFilter } from '../types/source-filter';
import { usePickerDraft } from './use-picker-draft';

export function usePickerSheet() {
  const open = usePickerStore((state) => state.open);
  const opener = usePickerStore((state) => state.opener);
  const setOpen = usePickerStore((state) => state.setOpen);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const draft = usePickerDraft();

  useEffect(() => () => setOpen(false), [setOpen]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setFilter('all');
    setConfirmingDiscard(false);
    draft.reset();
  };

  const changeOpen = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    if (draft.dirty) {
      setConfirmingDiscard(true);
      return;
    }
    close();
  };

  const apply = () => {
    if (draft.apply()) close();
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
    draft,
    changeQuery: setQuery,
    changeFilter: setFilter,
    focusList: () => listRef.current?.querySelector<HTMLElement>('[data-row-index][tabindex="0"]')?.focus(),
  };

  return {
    open,
    changeOpen,
    apply,
    discard: close,
    confirmingDiscard,
    setConfirmingDiscard,
    onEscapeKeyDown,
    onInteractOutside,
    onCloseAutoFocus,
    sheet,
  };
}
