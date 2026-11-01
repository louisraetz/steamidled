import { QR_LIFETIME_MS } from '../constants/login';

export function qrLifetime(expiresAt: number, receivedAt: number): number {
  return Math.max(QR_LIFETIME_MS, expiresAt - receivedAt);
}

export function qrProgress(remaining: number, lifetime: number): number {
  return Math.min(100, Math.max(0, (remaining / lifetime) * 100));
}
