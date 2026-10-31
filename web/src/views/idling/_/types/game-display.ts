export type DisplayStatus = 'idling' | 'exempt' | 'cooldown' | 'paused';

export interface GameDisplay {
  appid: number;
  name: string;
  status: DisplayStatus;
  next: string;
  nextShort: string | null;
  statusDetail: string;
  nextDetail: string;
  total: string;
  totalTitle: string | undefined;
  session: string;
}
