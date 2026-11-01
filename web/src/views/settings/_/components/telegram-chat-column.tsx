import { Button } from '@/components/ui/button';
import { CHAT_TITLE } from '../constants/telegram-preview';
import { useTelegramSends } from '../hooks/use-telegram-sends';
import { ChatHandle } from './chat-handle';
import { TelegramChatPreview } from './telegram-chat-preview';

interface TelegramChatColumnProps {
  botUsername: string | null;
  disabled: boolean;
}

export function TelegramChatColumn({ botUsername, disabled }: TelegramChatColumnProps) {
  const { test, report } = useTelegramSends();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="shrink-0 text-sm font-semibold">{CHAT_TITLE}</span>
        <ChatHandle botUsername={botUsername} />
      </div>
      <TelegramChatPreview />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={disabled} pending={test.isPending} onClick={() => test.mutate()}>
          Send test message
        </Button>
        <Button variant="outline" disabled={disabled} pending={report.isPending} onClick={() => report.mutate()}>
          Send report now
        </Button>
      </div>
    </div>
  );
}
