import { cn } from '@/lib/utils';
import type { OdometerChar } from '../types/odometer-char';

export function OdometerCell({ char }: { char: OdometerChar }) {
  return (
    <span className={cn('h-lh overflow-hidden', char.cellClassName)}>
      <span
        data-slot="odometer-strip"
        className={cn(
          'flex flex-col transition-transform duration-450 ease-out motion-reduce:transition-none',
          char.offsetClassName,
          char.delayClassName
        )}
      >
        {char.glyphs.map((glyph, index) => (
          <span key={index} className="h-lh">
            {glyph}
          </span>
        ))}
      </span>
    </span>
  );
}
