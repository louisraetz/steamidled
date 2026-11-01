import { FieldSet } from '@/components/ui/field';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { RANGES } from '../constants/schedule';
import { useScheduleForm } from '../hooks/use-schedule-form';
import { RangeField } from './range-field';
import { ScheduleSentence } from './schedule-sentence';

export function ScheduleRanges() {
  const enabled = useDaemonState((snapshot) => snapshot.settings.schedule.enabled) ?? true;
  const canMutate = useCanMutate();
  const { form, savedKey, queueSave } = useScheduleForm();
  const disabled = !enabled || !canMutate;

  return (
    <FieldSet disabled={disabled} aria-label="Cooldown ranges">
      {RANGES.map((range) => (
        <RangeField
          key={range.key}
          range={range}
          form={form}
          saved={savedKey === range.key}
          disabled={disabled}
          onCommit={() => queueSave(range.key)}
        />
      ))}
      <ScheduleSentence control={form.control} enabled={enabled} />
    </FieldSet>
  );
}
