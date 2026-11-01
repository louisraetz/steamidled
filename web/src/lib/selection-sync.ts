import { toast } from 'sonner';
import { api } from '@/lib/api';
import { SELECTION_BATCH_MS, SELECTION_ERROR_PREFIX } from '@/lib/constants';
import { errorText } from '@/lib/error-text';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { applyIntents, sameSelection, selectionOf, withSelection } from '@/lib/selection';
import { toastTarget } from '@/lib/toast-target';
import type { DaemonSnapshot, IdlingGameSnapshot, LibraryGame } from '@/lib/types';
import type { PlaceholderSources } from '@/types/placeholder-sources';
import type { SelectionIntent } from '@/types/selection-intent';

const intents = new Map<number, SelectionIntent>();
const known = new Map<number, IdlingGameSnapshot>();
let server: DaemonSnapshot | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let version = 0;
let generation = 0;

function sources(): PlaceholderSources {
  return { library: queryClient.getQueryData<LibraryGame[]>(queryKeys.library) ?? [], known };
}

function writeCache(snapshot: DaemonSnapshot): void {
  queryClient.setQueryData(queryKeys.state, snapshot);
}

function desiredFor(snapshot: DaemonSnapshot): number[] {
  return applyIntents(selectionOf(snapshot), intents);
}

function clearTimer(): void {
  if (timer) clearTimeout(timer);
  timer = null;
}

export function receiveServerSnapshot(snapshot: DaemonSnapshot): DaemonSnapshot {
  server = snapshot;
  for (const game of snapshot.games) known.set(game.appid, game);
  if (intents.size === 0) return snapshot;
  return withSelection(snapshot, desiredFor(snapshot), sources());
}

export function writeServerSnapshot(snapshot: DaemonSnapshot): void {
  writeCache(receiveServerSnapshot(snapshot));
}

export function discardPendingSelection(): void {
  intents.clear();
  clearTimer();
  generation += 1;
}

function dropIntentsUpTo(sentVersion: number): void {
  for (const [appid, intent] of intents) {
    if (intent.version <= sentVersion) intents.delete(appid);
  }
}

function settle(): void {
  inFlight = false;
  if (intents.size > 0 && timer === null) flush();
}

function flush(): void {
  timer = null;
  if (intents.size === 0 || inFlight || !server) return;
  const appIds = desiredFor(server);
  if (sameSelection(appIds, selectionOf(server))) {
    intents.clear();
    writeCache(server);
    return;
  }
  const sentVersion = version;
  const sentGeneration = generation;
  inFlight = true;
  api
    .setSelection(appIds)
    .then(
      (snapshot) => {
        if (sentGeneration !== generation) return;
        dropIntentsUpTo(sentVersion);
        writeServerSnapshot(snapshot);
      },
      (error: Error) => {
        if (sentGeneration !== generation) return;
        intents.clear();
        if (server) writeCache(server);
        toast.error(errorText(error, SELECTION_ERROR_PREFIX), toastTarget());
      }
    )
    .finally(settle);
}

export function updateSelection(change: (appIds: readonly number[]) => number[]): boolean {
  const current = queryClient.getQueryData<DaemonSnapshot>(queryKeys.state);
  if (!current || !server) return false;
  const before = desiredFor(server);
  const next = change(before);
  if (sameSelection(next, before)) return false;
  version += 1;
  for (const appid of next) {
    if (!before.includes(appid)) intents.set(appid, { wanted: true, version });
  }
  for (const appid of before) {
    if (!next.includes(appid)) intents.set(appid, { wanted: false, version });
  }
  writeCache(withSelection(current, desiredFor(server), sources()));
  clearTimer();
  timer = setTimeout(flush, SELECTION_BATCH_MS);
  return true;
}
