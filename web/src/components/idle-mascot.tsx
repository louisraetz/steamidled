import { cn } from '@/lib/utils';
import { LOGO_PAD_PATH, LOGO_VIEW_BOX } from './_/constants/logo';
import { MASCOT_PARTS } from './_/constants/mascot-parts';
import type { MascotVariant } from './_/types/mascot';

interface IdleMascotProps {
  variant: MascotVariant;
  blink?: boolean;
  className?: string;
}

export function IdleMascot({ variant, blink = false, className }: IdleMascotProps) {
  return (
    <svg
      viewBox={LOGO_VIEW_BOX}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('shrink-0 overflow-visible text-muted-foreground', className)}
    >
      <path d={LOGO_PAD_PATH} className="fill-foreground" />
      {MASCOT_PARTS[variant].map((Part, index) => (
        <Part key={index} blink={blink} />
      ))}
    </svg>
  );
}
