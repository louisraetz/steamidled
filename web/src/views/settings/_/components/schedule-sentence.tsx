import type { UseFormReturn } from 'react-hook-form';
import { RichText } from '@/components/rich-text';
import { scheduleSentence } from '../helpers/schedule-sentence';
import { useDisplayedHours } from '../hooks/use-displayed-hours';
import type { ScheduleFormValues } from '../types/schedule-form';

interface ScheduleSentenceProps {
  form: UseFormReturn<ScheduleFormValues>;
  enabled: boolean;
  custom: boolean;
}

export function ScheduleSentence({ form, enabled, custom }: ScheduleSentenceProps) {
  const hours = useDisplayedHours(form, custom);
  return (
    <p aria-live="polite">
      <RichText parts={scheduleSentence(enabled, hours)} />
    </p>
  );
}
