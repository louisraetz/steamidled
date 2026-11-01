import { useDaemonState } from '@/hooks/use-daemon-state';
import { connectionCopy } from '@/lib/connection-copy';
import { SteamConnectionAlertBody } from './steam-connection-alert-body';

export function SteamConnectionAlert() {
  const connection = useDaemonState((snapshot) => snapshot.connection);
  if (!connection) return null;
  const copy = connectionCopy(connection);
  if (!copy.alert) return null;
  return <SteamConnectionAlertBody connection={connection} copy={copy} alert={copy.alert} />;
}
