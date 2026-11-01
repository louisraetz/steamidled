import type { QueryClient } from '@tanstack/react-query';
import { LOG_BUFFER_SIZE, STREAM_RETRY_BASE_MS, STREAM_RETRY_MAX_MS } from '@/lib/constants';
import { queryKeys } from '@/lib/query-keys';
import { writeServerSnapshot } from '@/lib/selection-sync';
import type { DaemonSnapshot, LogEntry } from '@/lib/types';
import { useConnectionStore } from '@/stores/connection-store';

export interface DaemonStream {
  start: () => void;
  stop: () => void;
}

function appendLog(entries: LogEntry[] | undefined, entry: LogEntry): LogEntry[] | undefined {
  if (!entries) return entries;
  if (entries.some((existing) => existing.id === entry.id)) return entries;
  const next = [...entries, entry].sort((a, b) => a.id - b.id);
  return next.slice(-LOG_BUFFER_SIZE);
}

function retryDelay(attempt: number): number {
  return Math.min(STREAM_RETRY_MAX_MS, STREAM_RETRY_BASE_MS * 2 ** attempt);
}

function openSource(queryClient: QueryClient, onOpen: () => void, onClosed: () => void): EventSource {
  const source = new EventSource('/api/events');
  const { markOpen, markLost, syncClock } = useConnectionStore.getState();
  let accountName: string | null | undefined;
  let libraryVersion: number | undefined;

  source.addEventListener('open', () => {
    markOpen();
    onOpen();
    void queryClient.invalidateQueries({ queryKey: queryKeys.logs });
  });
  source.addEventListener('error', () => {
    markLost();
    if (source.readyState === EventSource.CLOSED) onClosed();
  });
  source.addEventListener('state', (event) => {
    const snapshot = JSON.parse((event as MessageEvent<string>).data) as DaemonSnapshot;
    syncClock(snapshot.serverTime);
    writeServerSnapshot(snapshot);
    const accountChanged = accountName !== undefined && accountName !== snapshot.accountName;
    const libraryChanged = libraryVersion !== undefined && libraryVersion !== snapshot.libraryVersion;
    if (accountChanged || libraryChanged) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.library });
    }
    accountName = snapshot.accountName;
    libraryVersion = snapshot.libraryVersion;
  });
  source.addEventListener('log', (event) => {
    const entry = JSON.parse((event as MessageEvent<string>).data) as LogEntry;
    queryClient.setQueryData<LogEntry[]>(queryKeys.logs, (entries) => appendLog(entries, entry));
  });
  return source;
}

export function createDaemonStream(queryClient: QueryClient): DaemonStream {
  let source: EventSource | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const stop = () => {
    source?.close();
    source = null;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  };

  const reconnectLater = () => {
    source?.close();
    source = null;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      start();
      void queryClient.invalidateQueries({ queryKey: queryKeys.state });
    }, retryDelay(attempt));
    attempt += 1;
  };

  const start = () => {
    if (source || retryTimer) return;
    source = openSource(
      queryClient,
      () => {
        attempt = 0;
      },
      reconnectLater
    );
  };

  return { start, stop };
}
