import { CHAT_PREVIEW_LABEL } from '../constants/telegram-preview';
import type { ChatBubbleModel } from '../types/chat-bubble';
import { ChatAlwaysSent } from './chat-always-sent';
import { ChatBubble } from './chat-bubble';

interface ChatPreviewProps {
  bubbles: ChatBubbleModel[];
  alwaysSent?: ChatBubbleModel;
}

export function ChatPreview({ bubbles, alwaysSent }: ChatPreviewProps) {
  return (
    <ol aria-label={CHAT_PREVIEW_LABEL} className="flex flex-col items-start gap-2">
      {bubbles.map((bubble) => (
        <ChatBubble key={bubble.key} bubble={bubble} />
      ))}
      <ChatAlwaysSent bubble={alwaysSent} />
    </ol>
  );
}
