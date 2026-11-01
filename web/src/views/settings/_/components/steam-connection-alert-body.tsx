import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RichText } from '@/components/rich-text';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useNow } from '@/hooks/use-now';
import { canRetryNow, type ConnectionCopy } from '@/lib/connection-copy';
import type { Connection } from '@/lib/types';
import { useSessionActions } from '../hooks/use-session-actions';
import { RetryNowButton } from './retry-now-button';

interface SteamConnectionAlertBodyProps {
  connection: Connection;
  copy: ConnectionCopy;
  alert: NonNullable<ConnectionCopy['alert']>;
}

export function SteamConnectionAlertBody({ connection, copy, alert }: SteamConnectionAlertBodyProps) {
  const now = useNow();
  const canMutate = useCanMutate();
  const { retry } = useSessionActions();
  const Icon = copy.icon;

  return (
    <Alert>
      <Icon />
      <AlertTitle>{alert.title}</AlertTitle>
      <AlertDescription>
        <p>
          <RichText parts={alert.body(connection, now)} />
        </p>
        <RetryNowButton
          visible={canRetryNow(connection)}
          disabled={!canMutate}
          pending={retry.isPending}
          onClick={() => retry.mutate()}
        />
      </AlertDescription>
    </Alert>
  );
}
