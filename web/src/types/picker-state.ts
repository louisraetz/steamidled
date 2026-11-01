export interface PickerState {
  open: boolean;
  opener: HTMLElement | null;
  setOpen: (open: boolean) => void;
  show: (opener: HTMLElement) => void;
}
