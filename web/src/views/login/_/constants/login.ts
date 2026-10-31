import { GUARD_CODE_LENGTH } from '../schemas/login-schema';

export const QR_SIZE = 192;

export const GUARD_SLOTS = Array.from({ length: GUARD_CODE_LENGTH }, (_, index) => index);

export const PASSWORD_ALERTS: Record<string, { title: string; body: string }> = {
  'Too many sign-in attempts': {
    title: 'Too many sign-in attempts',
    body: 'Steam is refusing new sign-ins for now. Wait a while, then try again.',
  },
  'Too many wrong codes': {
    title: 'Too many wrong codes',
    body: 'Sign in again to get a new code.',
  },
};
