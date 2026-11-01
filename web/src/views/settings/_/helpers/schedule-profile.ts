import { customRanges, type ScheduleRanges } from '@/lib/settings';
import type { DaemonSnapshot } from '@/lib/types';

export function customBase(snapshot: DaemonSnapshot): ScheduleRanges {
  return customRanges(snapshot.settings.schedule) ?? snapshot.effectiveSchedule;
}
