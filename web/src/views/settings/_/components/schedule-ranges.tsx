import { FieldSet } from '@/components/ui/field';
import { RANGES } from '../constants/schedule';
import type { ScheduleFormState } from '../types/schedule-form-state';
import { RangeField } from './range-field';

interface ScheduleRangesProps {
  schedule: ScheduleFormState;
  disabled: boolean;
  visible: boolean;
}

export function ScheduleRanges({ schedule, disabled, visible }: ScheduleRangesProps) {
  if (!visible) return null;
  return (
    <FieldSet disabled={disabled} aria-label="Cooldown ranges" className="md:grid md:grid-cols-2 md:gap-8">
      {RANGES.map((range) => (
        <RangeField
          key={range.key}
          range={range}
          form={schedule.form}
          saved={schedule.savedKey === range.key}
          disabled={disabled}
          onCommit={() => schedule.queueSave(range.key)}
        />
      ))}
    </FieldSet>
  );
}
