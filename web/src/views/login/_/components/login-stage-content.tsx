import { useDaemonState } from '@/hooks/use-daemon-state';
import { loginStage, signingInTitle } from '../helpers/login-stage';
import type { LoginActions } from '../types/login-actions';
import { LoginExpired } from './login-expired';
import { LoginMethods } from './login-methods';
import { SigningIn } from './signing-in';
import { SteamGuardStep } from './steam-guard-step';

export function LoginStageContent({ actions }: { actions: LoginActions }) {
  const login = useDaemonState((snapshot) => snapshot.login) ?? null;
  const stage = loginStage(login, actions.password.isPending);
  const guardShown = actions.password.data?.login?.status === 'guard';
  if (stage === 'guard' && login?.status === 'guard') return <SteamGuardStep guard={login} actions={actions} />;
  if (stage === 'signing-in') return <SigningIn title={signingInTitle(guardShown)} />;
  if (stage === 'expired') return <LoginExpired actions={actions} />;
  return <LoginMethods actions={actions} />;
}
