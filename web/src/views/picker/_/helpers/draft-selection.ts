import { MAX_IDLE_GAMES } from '@/lib/constants';
import type { DraftChanges } from '../types/draft-changes';

export const NO_DRAFT_CHANGES: DraftChanges = { added: [], removed: [] };

export function draftSelection(live: readonly number[], changes: DraftChanges): number[] {
  const kept = live.filter((appid) => !changes.removed.includes(appid));
  const added = changes.added.filter((appid) => !live.includes(appid));
  return [...kept, ...added].slice(0, MAX_IDLE_GAMES);
}

export function toggleDraftGame(live: readonly number[], changes: DraftChanges, appid: number): DraftChanges {
  if (live.includes(appid)) {
    const removed = changes.removed.includes(appid)
      ? changes.removed.filter((entry) => entry !== appid)
      : [...changes.removed, appid];
    return { ...changes, removed };
  }
  if (changes.added.includes(appid)) {
    return { ...changes, added: changes.added.filter((entry) => entry !== appid) };
  }
  if (draftSelection(live, changes).length >= MAX_IDLE_GAMES) return changes;
  return { ...changes, added: [...changes.added, appid] };
}
