import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { LoginFlowState } from '@/lib/types';
import type { LoginActions } from '../types/login-actions';
import { LoginAlert } from './login-alert';
import { QrChallenge } from './qr-challenge';

export function QrState({ login, actions }: { login: LoginFlowState | null; actions: LoginActions }) {
  const restart = () => actions.startQr.mutate();
  if (actions.startQr.error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <LoginAlert title="Couldn't get a QR code" body={actions.startQr.error.message} />
        <Button variant="outline" pending={actions.startQr.isPending} onClick={restart}>
          Try again
        </Button>
      </div>
    );
  }
  if (login?.method === 'qr' && (login.status === 'pending' || login.status === 'scanned')) {
    return <QrChallenge login={login} />;
  }
  if (login?.method === 'qr' && login.status === 'expired') {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>This code expired.</p>
        <Button variant="outline" pending={actions.startQr.isPending} onClick={restart}>
          New code
        </Button>
      </div>
    );
  }
  if (login?.method === 'qr' && login.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-3">
        <LoginAlert title="Steam didn't accept the sign-in" body={login.message} />
        <Button variant="outline" pending={actions.startQr.isPending} onClick={restart}>
          Try again
        </Button>
      </div>
    );
  }
  return <Skeleton className="size-54 rounded-xl appear-delayed" />;
}
