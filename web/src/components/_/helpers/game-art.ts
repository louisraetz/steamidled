import type { SyntheticEvent } from 'react';
import { STEAM_CAPSULE_URL } from '@/lib/constants';

const WORD_SEPARATOR = /[^\p{L}\p{N}]+/u;

export function capsuleUrl(appid: number): string {
  return STEAM_CAPSULE_URL.replace('{appid}', String(appid));
}

export function gameInitials(name: string): string {
  return name
    .split(WORD_SEPARATOR)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

export function revealLoadedImage(event: SyntheticEvent<HTMLImageElement>): void {
  event.currentTarget.dataset.loaded = 'true';
}
