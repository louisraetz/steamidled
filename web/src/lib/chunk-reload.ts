import { CHUNK_RELOAD_KEY, CHUNK_RELOAD_WINDOW_MS } from './constants';

export function reloadForStaleChunk(): void {
  const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
  if (Date.now() - lastReloadAt < CHUNK_RELOAD_WINDOW_MS) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  window.location.reload();
}
