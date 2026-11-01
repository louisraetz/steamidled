import { CircleAlert, RefreshCw } from 'lucide-react';
import { canRetryNow, connectionCopy } from '@/lib/connection-copy';
import { LIBRARY_RETRY_TITLE, libraryRetryAt, libraryRetryBody } from '@/lib/library-retry';
import { nextTry, plain } from '@/lib/text-parts';
import type { DaemonSnapshot } from '@/lib/types';
import type { StateAlertContent } from '../types/state-alert-content';

const RETRY_NOW_LABEL = 'Retry now';

function sentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

export function stateAlertContent(snapshot: DaemonSnapshot, now: number): StateAlertContent | null {
  const { phase, connection } = snapshot;
  if (phase === 'error' && snapshot.error) {
    return {
      variant: 'destructive',
      icon: CircleAlert,
      title: 'Idling stopped',
      body: [plain(`${sentence(snapshot.error.message)} ${snapshot.error.hint}`)],
      retryLabel: 'Try again',
    };
  }
  if (phase === 'signing-in' && snapshot.nextRetryAt !== null) {
    return {
      variant: 'default',
      icon: RefreshCw,
      title: 'Waiting for Steam',
      body: [
        plain("Steam didn't let steamidled sign in yet. Next try "),
        ...nextTry(snapshot.nextRetryAt, now),
        plain('. Idling starts on its own after that.'),
      ],
      retryLabel: null,
    };
  }
  const libraryRetry = libraryRetryAt(snapshot);
  if (libraryRetry !== null) {
    return {
      variant: 'default',
      icon: RefreshCw,
      title: LIBRARY_RETRY_TITLE,
      body: libraryRetryBody(libraryRetry, now),
      retryLabel: null,
    };
  }
  const copy = connectionCopy(connection);
  if (!copy.alert) return null;
  return {
    variant: 'default',
    icon: copy.icon,
    title: copy.alert.title,
    body: copy.alert.body(connection, now),
    retryLabel: canRetryNow(connection) ? RETRY_NOW_LABEL : null,
  };
}
