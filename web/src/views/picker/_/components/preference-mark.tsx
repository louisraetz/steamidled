import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

interface PreferenceMarkProps {
  visible: boolean;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  className: string;
}

export function PreferenceMark({ visible, icon: Icon, label, className }: PreferenceMarkProps) {
  if (!visible) return null;
  return (
    <>
      <Icon aria-hidden className={cn('size-4 shrink-0', className)} />
      <span className="sr-only">{label}</span>
    </>
  );
}
