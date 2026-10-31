import { FOLLOW_THRESHOLD_PX } from '../constants/log-tail';

export function isNearBottom(element: HTMLElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= FOLLOW_THRESHOLD_PX;
}
