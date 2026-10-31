import { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import type { GuardState } from '../types/guard-state';
import type { LoginActions } from '../types/login-actions';
import { CodeInsteadButton } from './code-instead-button';
import { GuardCodeForm } from './guard-code-form';

interface GuardInputProps {
  guard: GuardState;
  firstTriesLeft: number;
  actions: LoginActions;
}

export function GuardInput({ guard, firstTriesLeft, actions }: GuardInputProps) {
  const [useCode, setUseCode] = useState(false);
  const waits = guard.guard === 'device-confirmation' || guard.guard === 'email-confirmation';
  if (waits && !(useCode && guard.codeAllowed)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Spinner />
          Waiting for approval…
        </p>
        <CodeInsteadButton visible={guard.codeAllowed} onClick={() => setUseCode(true)} />
      </div>
    );
  }
  return (
    <GuardCodeForm
      key={guard.triesLeft}
      triesLeft={guard.triesLeft}
      firstTriesLeft={firstTriesLeft}
      pending={actions.guard.isPending}
      requestError={actions.guard.error?.message ?? null}
      onSubmit={(code) => actions.guard.mutate(code)}
    />
  );
}
