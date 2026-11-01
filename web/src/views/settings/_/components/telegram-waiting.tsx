import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTelegramPolling } from '../hooks/use-telegram-polling';
import { TelegramCheckAgain } from './telegram-check-again';
import { TelegramWaitingStatus } from './telegram-waiting-status';

interface TelegramWaitingProps {
  botUsername: string;
  cancelling: boolean;
  onCancel: () => void;
}

export function TelegramWaiting({ botUsername, cancelling, onCancel }: TelegramWaitingProps) {
  const polling = useTelegramPolling();
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-prose">Send /start to @{botUsername} in Telegram.</p>
      <TelegramWaitingStatus timedOut={polling.timedOut} botUsername={botUsername} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" asChild>
          <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">
            Open @{botUsername}
            <ExternalLink />
          </a>
        </Button>
        <TelegramCheckAgain visible={polling.timedOut} checking={polling.checking} onClick={polling.checkAgain} />
        <Button variant="ghost" pending={cancelling} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
