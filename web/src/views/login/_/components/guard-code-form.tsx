import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { Controller, useForm } from 'react-hook-form';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { presentErrors } from '@/lib/form-errors';
import { GUARD_SLOTS } from '../constants/login';
import { wrongCodeMessage } from '../helpers/wrong-code-message';
import { GUARD_CODE_LENGTH, guardCodeSchema, type GuardCodeValues } from '../schemas/login-schema';

interface GuardCodeFormProps {
  triesLeft: number;
  firstTriesLeft: number;
  pending: boolean;
  requestError: string | null;
  onSubmit: (code: string) => void;
}

export function GuardCodeForm({ triesLeft, firstTriesLeft, pending, requestError, onSubmit }: GuardCodeFormProps) {
  const form = useForm<GuardCodeValues>({
    resolver: zodResolver(guardCodeSchema),
    defaultValues: { code: '' },
  });
  const submit = form.handleSubmit((values) => onSubmit(values.code));
  const requestMessage = requestError ? { message: requestError } : undefined;

  return (
    <form noValidate onSubmit={submit}>
      <Controller
        name="code"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="guard-code">Code</FieldLabel>
            <InputOTP
              id="guard-code"
              maxLength={GUARD_CODE_LENGTH}
              pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
              inputMode="text"
              autoComplete="one-time-code"
              autoFocus
              disabled={pending}
              containerClassName="font-mono"
              value={field.value}
              onChange={(value) => field.onChange(value.toUpperCase())}
              onComplete={() => void submit()}
            >
              <InputOTPGroup>
                {GUARD_SLOTS.map((slot) => (
                  <InputOTPSlot key={slot} index={slot} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <FieldError errors={presentErrors(fieldState.error, wrongCodeMessage(triesLeft, firstTriesLeft), requestMessage)} />
          </Field>
        )}
      />
    </form>
  );
}
