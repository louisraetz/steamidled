import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { guardPrompt } from '../helpers/login-stage';
import type { GuardState } from '../types/guard-state';
import type { LoginActions } from '../types/login-actions';
import { GuardInput } from './guard-input';

export function SteamGuardStep({ guard, actions }: { guard: GuardState; actions: LoginActions }) {
  const [firstTriesLeft] = useState(guard.triesLeft);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Steam Guard</h1>
        <p className="text-muted-foreground">{guardPrompt(guard.guard, guard.emailDomain)}</p>
      </div>
      <GuardInput guard={guard} firstTriesLeft={firstTriesLeft} actions={actions} />
      <div className="-ml-3">
        <Button variant="ghost" size="sm" pending={actions.cancel.isPending} onClick={() => actions.cancel.mutate()}>
          Back
        </Button>
      </div>
    </div>
  );
}
