import type { ChatBubbleModel } from '../types/chat-bubble';
import { ChatBubbleMeta } from './chat-bubble-meta';

export function ChatBubble({ bubble }: { bubble: ChatBubbleModel }) {
  return (
    <li className="w-fit max-w-sm rounded-lg bg-surface px-3 py-2 text-sm whitespace-pre-line wrap-break-word">
      {bubble.text}
      <ChatBubbleMeta text={bubble.meta} />
    </li>
  );
}
