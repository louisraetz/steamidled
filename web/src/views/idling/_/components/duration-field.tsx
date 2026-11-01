import { Controller, useFormState, type UseFormReturn } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { presentErrors } from '@/lib/form-errors';
import { formatHoursLabel } from '../helpers/duration';
import type { DurationValues } from '../types/schedule-dialog';
import { DurationUnitSelect } from './duration-unit-select';

interface DurationFieldProps {
  form: UseFormReturn<DurationValues>;
  maxHours: number;
  serverError: Error | null;
}

export function DurationField({ form, maxHours, serverError }: DurationFieldProps) {
  const { errors } = useFormState({ control: form.control });
  const invalid = Boolean(errors.amount || serverError);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor="schedule-duration">Duration</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          {...form.register('amount', { valueAsNumber: true })}
          id="schedule-duration"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          aria-invalid={invalid}
          className="w-28 font-mono"
        />
        <Controller
          control={form.control}
          name="unit"
          render={({ field }) => <DurationUnitSelect value={field.value} onChange={field.onChange} />}
        />
      </div>
      <FieldDescription>Up to {formatHoursLabel(maxHours)}.</FieldDescription>
      <FieldError errors={presentErrors(errors.amount, serverError ?? undefined)} />
    </Field>
  );
}
