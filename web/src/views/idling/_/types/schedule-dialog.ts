export type ScheduleDialogMode = 'cooldown-now' | 'next-cooldown' | 'cooldown-remaining';

export type DurationUnit = 'hours' | 'days';

export interface DurationValues {
  amount: number;
  unit: DurationUnit;
}

export interface ScheduleDialogState {
  open: boolean;
  mode: ScheduleDialogMode;
  key: number;
}

export interface ScheduleDialogCopy {
  title: (name: string) => string;
  description: (name: string) => string;
  maxHours: number;
}
