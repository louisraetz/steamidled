import { useWatch, type Control } from 'react-hook-form';
import { RichText } from '@/components/rich-text';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { DEFAULT_SCHEDULE } from '../constants/schedule';
import { scheduleSentence } from '../helpers/schedule-sentence';
import type { ScheduleFormValues } from '../types/schedule-form';

export function ScheduleSentence({ control, enabled }: { control: Control<ScheduleFormValues>; enabled: boolean }) {
  const values = useWatch({ control });
  const schedule = useDaemonState((snapshot) => snapshot.settings.schedule) ?? DEFAULT_SCHEDULE;
  return (
    <p aria-live="polite" className="text-muted-foreground">
      <RichText parts={scheduleSentence(enabled, values, schedule)} />
    </p>
  );
}
