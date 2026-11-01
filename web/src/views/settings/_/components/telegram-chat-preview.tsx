import { useTelegramPreview } from '../hooks/use-telegram-preview';
import { ChatPreview } from './chat-preview';

export function TelegramChatPreview() {
  const preview = useTelegramPreview();
  if (!preview) return null;
  return <ChatPreview bubbles={preview.bubbles} alwaysSent={preview.alwaysSent} />;
}
