import { useFormState, useWatch, type UseFormReturn } from 'react-hook-form';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';
import { presentErrors } from '@/lib/form-errors';
import { sliderValue } from '../helpers/schedule-form';
import type { RangeDefinition, ScheduleFormValues } from '../types/schedule-form';
import { RangeInput } from './range-input';
import { SavedNote } from './saved-note';

interface RangeFieldProps {
  range: RangeDefinition;
  form: UseFormReturn<ScheduleFormValues>;
  saved: boolean;
  disabled: boolean;
  onCommit: () => void;
}

const SET_OPTIONS = { shouldValidate: true, shouldDirty: true } as const;

export function RangeField({ range, form, saved, disabled, onCommit }: RangeFieldProps) {
  const values = useWatch({ control: form.control, name: range.key });
  const { errors } = useFormState({ control: form.control, name: range.key });
  const fieldErrors = errors[range.key];
  const name = range.label.toLowerCase();

  return (
    <Field data-invalid={Boolean(fieldErrors)} data-disabled={disabled}>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={`${range.key}-min`}>{range.label}</FieldLabel>
        <SavedNote visible={saved} />
      </div>
      <Slider
        min={range.min}
        max={range.max}
        step={1}
        minStepsBetweenThumbs={0}
        value={sliderValue(values, range)}
        disabled={disabled}
        thumbLabels={[`Shortest ${name} in ${range.unit}`, `Longest ${name} in ${range.unit}`]}
        onValueChange={([min, max]) => {
          form.setValue(`${range.key}.min`, min, SET_OPTIONS);
          form.setValue(`${range.key}.max`, max, SET_OPTIONS);
        }}
        onValueCommit={onCommit}
      />
      <div className="flex items-center gap-2">
        <RangeInput
          id={`${range.key}-min`}
          label={`Shortest ${name} in ${range.unit}`}
          unit={range.unit}
          min={range.min}
          max={range.max}
          invalid={Boolean(fieldErrors?.min)}
          registration={form.register(`${range.key}.min`, { valueAsNumber: true, onBlur: onCommit })}
        />
        <span aria-hidden="true" className="text-muted-foreground">
          to
        </span>
        <RangeInput
          id={`${range.key}-max`}
          label={`Longest ${name} in ${range.unit}`}
          unit={range.unit}
          min={range.min}
          max={range.max}
          invalid={Boolean(fieldErrors?.max)}
          registration={form.register(`${range.key}.max`, { valueAsNumber: true, onBlur: onCommit })}
        />
      </div>
      <FieldError errors={presentErrors(fieldErrors?.min, fieldErrors?.max)} />
    </Field>
  );
}
