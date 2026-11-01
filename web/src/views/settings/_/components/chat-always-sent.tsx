import { ALWAYS_SENT_LABEL } from '../constants/telegram-preview';
import type { ChatBubbleModel } from '../types/chat-bubble';
import { ChatBubble } from './chat-bubble';

export function ChatAlwaysSent({ bubble }: { bubble?: ChatBubbleModel }) {
  if (!bubble) return null;
  return (
    <>
      <li className="pt-2 text-sm text-tertiary">{ALWAYS_SENT_LABEL}</li>
      <ChatBubble bubble={bubble} />
    </>
  );
}
