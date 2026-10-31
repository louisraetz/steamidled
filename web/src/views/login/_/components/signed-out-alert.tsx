import { useDaemonState } from '@/hooks/use-daemon-state';
import { LoginAlert } from './login-alert';

export function SignedOutAlert() {
  const loginError = useDaemonState((snapshot) => snapshot.loginError);
  if (!loginError) return null;
  return <LoginAlert title={loginError.title} body={loginError.message} />;
}
