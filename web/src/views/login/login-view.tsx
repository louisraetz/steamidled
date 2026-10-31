import { BarePage } from '@/components/bare-page';
import { LoginStageContent } from './_/components/login-stage-content';
import { SignedOutAlert } from './_/components/signed-out-alert';
import { useLoginActions } from './_/hooks/use-login-actions';

export function LoginView() {
  const actions = useLoginActions();
  return (
    <BarePage>
      <main className="flex max-w-sm flex-col gap-6 pt-12 pb-12 sm:pt-24">
        <SignedOutAlert />
        <LoginStageContent actions={actions} />
      </main>
    </BarePage>
  );
}
