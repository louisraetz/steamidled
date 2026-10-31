import type { PasswordProblem } from '../types/login-stage';
import { LoginAlert } from './login-alert';

export function PasswordProblemAlert({ problem }: { problem: PasswordProblem }) {
  if (problem?.kind !== 'alert') return null;
  return <LoginAlert title={problem.title} body={problem.body} />;
}
