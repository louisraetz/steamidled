import { useDaemonEvents } from '@/hooks/use-daemon-events';
import { useDaemonQuery } from '@/hooks/use-daemon-state';
import { LoginView } from '@/views/login/login-view';
import { BootSkeleton } from './_/components/boot-skeleton';
import { DaemonUnreachable } from './_/components/daemon-unreachable';
import { AppShell } from './app-shell';

export function ConnectionGate() {
  useDaemonEvents();
  const query = useDaemonQuery();
  if (query.isPending) return <BootSkeleton />;
  if (!query.data) {
    return <DaemonUnreachable retrying={query.isFetching} onRetry={() => void query.refetch()} />;
  }
  if (query.data.phase === 'needs-login') return <LoginView />;
  return <AppShell />;
}
