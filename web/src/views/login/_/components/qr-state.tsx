import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import type { LoginFlowState } from '@/lib/types';
import { QR_SIZE } from '../constants/login';
import type { LoginActions } from '../types/login-actions';
import { LoginAlert } from './login-alert';

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
  if (login?.method === 'qr' && login.status === 'pending') {
    return (
      <div className="flex flex-col gap-3">
        <div className="size-48 bg-background text-foreground">
          <QRCodeSVG
            value={login.challengeUrl}
            size={QR_SIZE}
            level="M"
            marginSize={4}
            fgColor="currentColor"
            bgColor="transparent"
            title="Steam sign-in QR code"
          />
        </div>
        <p className="text-muted-foreground">Scan with the Steam mobile app.</p>
      </div>
    );
  }
  if (login?.method === 'qr' && login.status === 'scanned') {
    return (
      <div className="flex size-48 flex-col items-start justify-center gap-3">
        <Spinner className="size-5" />
        <p>Scanned. Approve the sign-in in the Steam app.</p>
      </div>
    );
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
  return <Skeleton className="size-48 appear-delayed" />;
}
