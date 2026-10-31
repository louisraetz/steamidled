import type { LoginFlowState } from '@/lib/types';
import { PASSWORD_ALERTS } from '../constants/login';
import type { LoginStage, PasswordProblem } from '../types/login-stage';

export function loginStage(login: LoginFlowState | null, passwordPending: boolean): LoginStage {
  if (login?.method !== 'password') return 'main';
  if (login.status === 'guard') return 'guard';
  if (login.status === 'expired') return 'expired';
  if (login.status === 'authenticating' && !passwordPending) return 'signing-in';
  return 'main';
}

export function passwordProblem(login: LoginFlowState | null, requestError: Error | null): PasswordProblem {
  if (requestError) return { kind: 'field', message: requestError.message };
  if (login?.method !== 'password' || login.status !== 'error') return null;
  const alert = PASSWORD_ALERTS[login.message];
  if (alert) return { kind: 'alert', ...alert };
  return { kind: 'field', message: login.message };
}

export function guardPrompt(guard: string, emailDomain: string | null): string {
  const address = emailDomain ? `your ${emailDomain} address` : 'your email address';
  if (guard === 'email-code') return `Enter the code Steam sent to ${address}.`;
  if (guard === 'device-code') return 'Enter the code from the Steam mobile app.';
  if (guard === 'email-confirmation') return `Open the link Steam sent to ${address} to approve the sign-in.`;
  return 'Approve the sign-in in the Steam mobile app.';
}

export function signingInTitle(guardShown: boolean): string {
  return guardShown ? 'Steam Guard' : 'Sign in to Steam';
}
