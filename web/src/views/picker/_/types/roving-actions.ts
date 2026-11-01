import type { RefObject } from 'react';

export interface RovingActions {
  listRef: RefObject<HTMLDivElement | null>;
  count: number;
  onFavorite: (index: number) => void;
  onExempt: (index: number) => void;
  onLeaveTop: () => void;
}
