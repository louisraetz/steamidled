import type { ComponentProps } from 'react';
import type { IdleMascot } from '@/components/idle-mascot';
import type { PersonaState } from '@/lib/settings';

interface PresenceLook {
  mascot: ComponentProps<typeof IdleMascot>['variant'];
  mascotClassName: string;
  indicatorClassName: string;
  labelClassName: string;
}

export const PRESENCE: Record<PersonaState, PresenceLook> = {
  online: {
    mascot: 'awake',
    mascotClassName: 'size-7',
    indicatorClassName: 'size-2 rounded-full bg-foreground',
    labelClassName: 'text-muted-foreground',
  },
  away: {
    mascot: 'asleep',
    mascotClassName: 'size-7',
    indicatorClassName: 'size-2 rounded-full border-2 border-muted-foreground',
    labelClassName: 'text-muted-foreground',
  },
  offline: {
    mascot: 'awake',
    mascotClassName: 'size-7 opacity-60 grayscale',
    indicatorClassName: 'hidden',
    labelClassName: 'text-tertiary',
  },
};
