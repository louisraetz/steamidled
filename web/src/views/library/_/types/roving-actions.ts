export interface RovingActions {
  count: number;
  onSelect: (index: number) => void;
  onFavorite: (index: number) => void;
  onExempt: (index: number) => void;
}
