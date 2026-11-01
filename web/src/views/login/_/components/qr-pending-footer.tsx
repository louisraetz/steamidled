import type { QrChallengeState } from '../types/qr-challenge-state';
import { QrExpiryBar } from './qr-expiry-bar';

export function QrPendingFooter({ login }: { login: QrChallengeState }) {
  if (login.status !== 'pending') return null;
  return (
    <>
      <QrExpiryBar key={login.expiresAt} expiresAt={login.expiresAt} />
      <p className="text-muted-foreground">Scan with the Steam mobile app.</p>
    </>
  );
}
