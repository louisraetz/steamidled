export type StreamStatus = 'connecting' | 'connected' | 'reconnecting';

export interface ConnectionState {
  status: StreamStatus;
  offset: number;
  frozenAt: number | null;
  markOpen: () => void;
  markLost: () => void;
  syncClock: (serverTime: number) => void;
}
