import { useEffect } from 'react';
import { useDaemonState } from '@/hooks/use-daemon-state';
import type { LoginActions } from '../types/login-actions';
import { QrState } from './qr-state';

export function QrLogin({ actions }: { actions: LoginActions }) {
  const login = useDaemonState((snapshot) => snapshot.login) ?? null;
  const active = login?.method === 'qr' && (login.status === 'pending' || login.status === 'scanned');

  useEffect(() => {
    if (!active) actions.startQr.mutate();
  }, []);

  return <QrState login={login} actions={actions} />;
}
