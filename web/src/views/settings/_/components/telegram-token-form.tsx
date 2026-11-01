import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { presentErrors } from '@/lib/form-errors';
import { BOTFATHER_URL } from '@/lib/constants';
import { telegramTokenSchema, type TelegramTokenValues } from '../schemas/telegram-schema';

interface TelegramTokenFormProps {
  pending: boolean;
  disabled: boolean;
  serverError: string | null;
  onSubmit: (token: string) => void;
  onCancel: () => void;
}

export function TelegramTokenForm({ pending, disabled, serverError, onSubmit, onCancel }: TelegramTokenFormProps) {
  const form = useForm<TelegramTokenValues>({
    resolver: zodResolver(telegramTokenSchema),
    defaultValues: { token: '' },
  });

  return (
    <form className="flex max-w-xl flex-col gap-4" noValidate onSubmit={form.handleSubmit((values) => onSubmit(values.token))}>
      <Controller
        name="token"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid || Boolean(serverError)}>
            <FieldLabel htmlFor="telegram-token">Bot token</FieldLabel>
            <Input
              {...field}
              id="telegram-token"
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={fieldState.invalid || Boolean(serverError)}
            />
            <FieldDescription>
              Create a bot with{' '}
              <a href={BOTFATHER_URL} target="_blank" rel="noreferrer">
                @BotFather
              </a>{' '}
              in Telegram and paste the token it gives you.
            </FieldDescription>
            <FieldError errors={presentErrors(fieldState.error, { message: serverError ?? undefined })} />
          </Field>
        )}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={disabled} pending={pending}>
          Continue
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
