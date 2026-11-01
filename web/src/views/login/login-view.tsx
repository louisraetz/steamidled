import { BarePage } from '@/components/bare-page';
import { BrandMark } from '@/components/brand-mark';
import { LoginStageContent } from './_/components/login-stage-content';
import { SignedOutAlert } from './_/components/signed-out-alert';
import { useLoginActions } from './_/hooks/use-login-actions';

export function LoginView() {
  const actions = useLoginActions();
  return (
    <BarePage>
      <main className="flex max-w-sm flex-col gap-6 pt-12 pb-12 sm:pt-24">
        <SignedOutAlert />
        <BrandMark className="size-16" />
        <LoginStageContent actions={actions} />
      </main>
    </BarePage>
  );
}
