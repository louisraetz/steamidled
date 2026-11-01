import { useSyncExternalStore } from 'react';
import { DESKTOP_MEDIA_QUERY } from '@/lib/constants';

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DESKTOP_MEDIA_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function isDesktop(): boolean {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, isDesktop);
}
