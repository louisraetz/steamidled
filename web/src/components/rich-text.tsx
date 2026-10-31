import type { TextPart } from '@/lib/text-parts';

export function RichText({ parts }: { parts: TextPart[] }) {
  return (
    <>
      {parts.map((part, index) => (
        <span key={index} className={part.className}>
          {part.text}
        </span>
      ))}
    </>
  );
}
