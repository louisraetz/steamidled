import type { ComponentType } from 'react';
import { CircleCheck, CircleDashed, Gamepad2, MonitorSmartphone, RefreshCw } from 'lucide-react';
import type { Tone } from '@/components/tone';
import { formatClock } from '@/lib/format';
import { mono, nextTry, plain, type TextPart } from '@/lib/text-parts';
import type { Connection } from '@/lib/types';

type ConnectionState = Connection['state'];
type ConnectionOf<State extends ConnectionState> = Extract<Connection, { state: State }>;

export interface ConnectionCopy<State extends ConnectionState = ConnectionState> {
  tone: Tone;
  icon: ComponentType<{ className?: string }>;
  label: string;
  shortLabel: string;
  countdownLabel: string | null;
  frozenReason: string | null;
  alert: { title: string; body(connection: ConnectionOf<State>, now: number): TextPart[] } | null;
}

const CONNECTION_COPY: { [State in ConnectionState]: ConnectionCopy<State> } = {
  reconnecting: {
    tone: 'warning',
    icon: RefreshCw,
    label: 'Reconnecting',
    shortLabel: 'Reconnecting',
    countdownLabel: 'Reconnecting in ',
    frozenReason: 'Reconnecting',
    alert: {
      title: 'Reconnecting to Steam',
      body: (connection, now) => [
        plain('Lost the connection at '),
        mono(formatClock(connection.since)),
        plain('. Next try '),
        ...nextTry(connection.nextRetryAt, now),
        plain(' (attempt '),
        mono(String(connection.attempt)),
        plain("). Playtime doesn't count until it's back."),
      ],
    },
  },
  'rate-limited': {
    tone: 'warning',
    icon: RefreshCw,
    label: 'Reconnecting',
    shortLabel: 'Reconnecting',
    countdownLabel: 'Reconnecting in ',
    frozenReason: 'Reconnecting',
    alert: {
      title: 'Reconnecting to Steam',
      body: (connection, now) => [
        plain('Steam is rate limiting sign-ins. Next try '),
        ...nextTry(connection.nextRetryAt, now),
        plain('.'),
      ],
    },
  },
  'taken-over': {
    tone: 'warning',
    icon: MonitorSmartphone,
    label: 'In use elsewhere',
    shortLabel: 'In use',
    countdownLabel: null,
    frozenReason: 'In use elsewhere',
    alert: {
      title: 'Steam session in use elsewhere',
      body: (connection, now) => [
        plain('This account signed in on another device and took over. steamidled tries again '),
        ...nextTry(connection.nextRetryAt, now),
        plain('.'),
      ],
    },
  },
  blocked: {
    tone: 'warning',
    icon: Gamepad2,
    label: 'Paused while you play',
    shortLabel: 'Paused',
    countdownLabel: null,
    frozenReason: 'Playing elsewhere',
    alert: {
      title: 'Paused while you play',
      body: () => [
        plain('A game is running on this account on another device. Idling picks up on its own when you stop.'),
      ],
    },
  },
  connected: {
    tone: 'success',
    icon: CircleCheck,
    label: 'Connected',
    shortLabel: 'Connected',
    countdownLabel: null,
    frozenReason: null,
    alert: null,
  },
  offline: {
    tone: 'neutral',
    icon: CircleDashed,
    label: 'Offline',
    shortLabel: 'Offline',
    countdownLabel: null,
    frozenReason: 'Stopped',
    alert: null,
  },
};

export function connectionCopy(connection: Connection): ConnectionCopy {
  return CONNECTION_COPY[connection.state] as ConnectionCopy;
}

export function retryTarget(connection: Connection): number | null {
  return 'nextRetryAt' in connection ? connection.nextRetryAt : null;
}
