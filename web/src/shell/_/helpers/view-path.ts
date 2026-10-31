import type { DaemonSnapshot } from '@/lib/types';
import { VIEWS, type ViewName } from '../constants/views';

export function viewFromPath(path: string): ViewName | null {
  return VIEWS.find((view) => view.path === path)?.value ?? null;
}

export function pathForView(view: string): string {
  return VIEWS.find((entry) => entry.value === view)?.path ?? '/idling';
}

export function isSettling(snapshot: DaemonSnapshot): boolean {
  return snapshot.phase === 'signing-in' || snapshot.phase === 'loading-library';
}

export function defaultPath(snapshot: DaemonSnapshot): string {
  if (snapshot.phase === 'ready' && snapshot.favoritesInLibrary === 0) return '/library';
  return '/idling';
}
