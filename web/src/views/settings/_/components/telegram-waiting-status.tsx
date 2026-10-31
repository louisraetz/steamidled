import { Spinner } from '@/components/ui/spinner';

export function TelegramWaitingStatus({ timedOut, botUsername }: { timedOut: boolean; botUsername: string }) {
  if (timedOut) {
    return <p className="text-muted-foreground">No message yet. Send /start to @{botUsername}, then check again.</p>;
  }
  return (
    <p className="flex items-center gap-2 text-muted-foreground">
      <Spinner />
      Waiting for your message…
    </p>
  );
}
