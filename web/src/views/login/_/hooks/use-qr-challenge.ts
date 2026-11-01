import { useState } from 'react';
import type { QrChallengeState } from '../types/qr-challenge-state';

export function useQrChallenge(login: QrChallengeState) {
  const pendingUrl = login.status === 'pending' ? login.challengeUrl : null;
  const [challengeUrl, setChallengeUrl] = useState(pendingUrl ?? '');
  if (pendingUrl !== null && pendingUrl !== challengeUrl) setChallengeUrl(pendingUrl);
  return { challengeUrl, scanned: login.status === 'scanned' };
}
