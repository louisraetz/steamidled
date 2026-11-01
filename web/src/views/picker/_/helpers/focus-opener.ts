import { OPENER_SELECTOR } from '../constants/picker';

export function focusOpener(opener: HTMLElement | null): void {
  const target = opener?.isConnected ? opener : document.querySelector<HTMLElement>(OPENER_SELECTOR);
  target?.focus();
}
