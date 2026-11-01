export function ChatBubbleMeta({ text }: { text: string | null }) {
  if (!text) return null;
  return <span className="block text-right font-mono text-sm text-tertiary">{text}</span>;
}
