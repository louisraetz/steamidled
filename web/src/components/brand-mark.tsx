import { cn } from '@/lib/utils';
import { LOGO_EYE_STROKE, LOGO_EYES_PATH, LOGO_PAD_PATH, LOGO_VIEW_BOX, LOGO_Z } from './_/constants/logo';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEW_BOX}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="steamidled"
      className={cn('shrink-0', className)}
    >
      <path d={LOGO_PAD_PATH} className="fill-foreground" />
      <path d={LOGO_EYES_PATH} strokeWidth={LOGO_EYE_STROKE} className="stroke-background" />
      {LOGO_Z.map((z) => (
        <path key={z.path} d={z.path} strokeWidth={z.width} className="stroke-cooldown" />
      ))}
    </svg>
  );
}
