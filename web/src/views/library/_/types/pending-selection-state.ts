export interface PendingSelectionState {
  accountName: string | null;
  draft: number[] | null;
  toggle: (appid: number, base: readonly number[], accountName: string | null) => void;
  replace: (appIds: number[], accountName: string | null) => void;
  discard: () => void;
}
