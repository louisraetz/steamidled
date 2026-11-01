import type { DaemonSnapshot } from '@/lib/types';
import type { ScheduleDialogMode } from './schedule-dialog';

export type ScheduleCommandKey = ScheduleDialogMode | 'end-cooldown';

export interface ScheduleCommandInput {
  appid: number;
  name: string;
  hours: number | null;
}

export interface ScheduleCommand {
  run: (input: ScheduleCommandInput) => Promise<DaemonSnapshot>;
  errorPrefix: string;
  success: (input: ScheduleCommandInput) => string;
}
