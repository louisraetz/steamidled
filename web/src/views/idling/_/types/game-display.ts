import type { GameStatus } from '@/lib/types';

export type DisplayStatus = 'idling' | 'cooldown' | 'paused';

export interface GameDisplay {
  appid: number;
  name: string;
  status: DisplayStatus;
  scheduleStatus: GameStatus;
  exempt: boolean;
  cooldownAt: number | null;
  cooldownUntil: number | null;
  next: string;
  nextDetail: string;
  total: string;
  totalTitle: string | undefined;
  session: string;
  today: string;
  todayTitle: string;
  dimmed: boolean;
  counting: boolean;
}
