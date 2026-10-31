import { CircleAlert, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { connectionCopy, retryTarget } from '@/lib/connection-copy';
import { formatCountdown } from '@/lib/format';
import { mono, plain, type TextPart } from '@/lib/text-parts';
import type { DaemonSnapshot } from '@/lib/types';
import type { ConnectionDisplay } from '../types/connection-display';

function countdown(target: number | null, now: number): TextPart | null {
  if (target === null) return null;
  return mono(formatCountdown(target - now));
}

function text(value: string): TextPart[] {
  return [plain(value)];
}

export function describeConnection(snapshot: DaemonSnapshot, now: number): ConnectionDisplay {
  const { phase, connection } = snapshot;
  if (phase === 'error') {
    return { tone: 'destructive', icon: CircleAlert, label: text('Stopped'), shortLabel: text('Stopped') };
  }
  if (phase === 'signing-in' || phase === 'loading-library') {
    const wait = countdown(snapshot.nextRetryAt, now);
    if (wait) {
      return { tone: 'warning', icon: RefreshCw, label: [plain('Waiting for Steam · '), wait], shortLabel: [wait] };
    }
    const label = text(phase === 'signing-in' ? 'Signing in…' : 'Loading library…');
    return { tone: 'neutral', icon: Spinner, label, shortLabel: label };
  }
  const copy = connectionCopy(connection);
  const wait = copy.countdownLabel === null ? null : countdown(retryTarget(connection), now);
  if (copy.countdownLabel !== null && wait) {
    return { tone: copy.tone, icon: copy.icon, label: [plain(copy.countdownLabel), wait], shortLabel: [wait] };
  }
  return { tone: copy.tone, icon: copy.icon, label: text(copy.label), shortLabel: text(copy.shortLabel) };
}
