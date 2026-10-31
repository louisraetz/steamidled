import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { presentErrors } from '@/lib/form-errors';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { passwordProblem } from '../helpers/login-stage';
import { passwordLoginSchema, type PasswordLoginValues } from '../schemas/login-schema';
import type { LoginActions } from '../types/login-actions';
import { PasswordProblemAlert } from './password-problem-alert';

export function PasswordLogin({ actions }: { actions: LoginActions }) {
  const login = useDaemonState((snapshot) => snapshot.login) ?? null;
  const problem = passwordProblem(login, actions.password.error);
  const serverError = problem?.kind === 'field' ? { message: problem.message } : undefined;
  const form = useForm<PasswordLoginValues>({
    resolver: zodResolver(passwordLoginSchema),
    defaultValues: { accountName: '', password: '' },
  });

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={form.handleSubmit((values) => actions.password.mutate(values))}
    >
      <PasswordProblemAlert problem={problem} />
      <FieldGroup>
        <Controller
          name="accountName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="account-name">Account name</FieldLabel>
              <Input {...field} id="account-name" autoComplete="username" aria-invalid={fieldState.invalid} />
              <FieldError errors={presentErrors(fieldState.error)} />
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || Boolean(serverError)}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                {...field}
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid || Boolean(serverError)}
              />
              <FieldError errors={presentErrors(fieldState.error, serverError)} />
            </Field>
          )}
        />
      </FieldGroup>
      <div>
        <Button type="submit" pending={actions.password.isPending}>
          Sign in
        </Button>
      </div>
    </form>
  );
}
