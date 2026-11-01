import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { useNow } from '@/hooks/use-now';
import { formatCountdown } from '@/lib/format';
import { qrLifetime, qrProgress } from '../helpers/qr-progress';

export function QrExpiryBar({ expiresAt }: { expiresAt: number }) {
  const now = useNow();
  const [lifetime] = useState(() => qrLifetime(expiresAt, now));
  const remaining = Math.max(0, expiresAt - now);
  return (
    <Progress
      size="sm"
      value={qrProgress(remaining, lifetime)}
      aria-label="QR code validity"
      getValueLabel={() => `Code expires in ${formatCountdown(remaining)}`}
      className="*:duration-1000 *:ease-linear"
    />
  );
}
