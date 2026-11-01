import { RichText } from '@/components/rich-text';
import type { TextPart } from '@/lib/text-parts';
import { cn } from '@/lib/utils';

export function ProfileTileLine({ parts, className }: { parts: TextPart[]; className?: string }) {
  if (parts.length === 0) return null;
  return (
    <span className={cn('text-sm text-balance', className)}>
      <RichText parts={parts} />
    </span>
  );
}
