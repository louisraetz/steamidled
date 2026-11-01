import { Button } from '@/components/ui/button';
import type { LoginActions } from '../types/login-actions';

export function LoginExpired({ actions }: { actions: LoginActions }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">Steam Guard</h1>
      <p className="text-muted-foreground">The sign-in request expired after 2 minutes.</p>
      <Button variant="outline" pending={actions.cancel.isPending} onClick={() => actions.cancel.mutate()}>
        Start over
      </Button>
    </div>
  );
}
