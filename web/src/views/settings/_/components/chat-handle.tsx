import { botHandle } from '../helpers/bot-handle';

export function ChatHandle({ botUsername }: { botUsername: string | null }) {
  if (!botUsername) return null;
  return <span className="min-w-0 truncate font-mono text-sm text-tertiary">{botHandle(botUsername)}</span>;
}
