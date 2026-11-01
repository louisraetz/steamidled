import { TEASER_TITLE } from '../constants/telegram-preview';
import { useTelegramTeaser } from '../hooks/use-telegram-preview';
import { ChatPreview } from './chat-preview';

export function TelegramOffPreview() {
  const bubbles = useTelegramTeaser();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">{TEASER_TITLE}</p>
      <ChatPreview bubbles={bubbles} />
    </div>
  );
}
