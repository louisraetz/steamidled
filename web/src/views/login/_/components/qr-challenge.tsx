import { useQrChallenge } from '../hooks/use-qr-challenge';
import type { QrChallengeState } from '../types/qr-challenge-state';
import { QrCode } from './qr-code';
import { QrPaper } from './qr-paper';
import { QrPendingFooter } from './qr-pending-footer';
import { QrScannedNotice } from './qr-scanned-notice';

export function QrChallenge({ login }: { login: QrChallengeState }) {
  const { challengeUrl, scanned } = useQrChallenge(login);
  return (
    <div className="flex w-54 flex-col gap-3">
      <QrPaper scanned={scanned}>
        <QrCode value={challengeUrl} hidden={scanned} />
        <QrScannedNotice visible={scanned} />
      </QrPaper>
      <QrPendingFooter login={login} />
    </div>
  );
}
