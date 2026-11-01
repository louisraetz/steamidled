import type { ComponentType } from 'react';
import { Infinity as InfinityIcon, Moon, Play, Star } from 'lucide-react';

export interface StatusSymbol {
  icon: ComponentType<{ className?: string }>;
  className: string;
  label: string;
}

const STATUS_SYMBOLS = {
  collecting: { icon: Play, className: 'text-primary', label: 'Collecting' },
  cooling: { icon: Moon, className: 'text-cooldown', label: 'Cooling down' },
  autoStart: { icon: Star, className: 'text-foreground', label: 'Auto-start' },
  noCooldown: { icon: InfinityIcon, className: 'text-primary', label: 'No cooldown' },
} satisfies Record<string, StatusSymbol>;

export const CHART_LEGEND: readonly StatusSymbol[] = [STATUS_SYMBOLS.collecting, STATUS_SYMBOLS.cooling];

export const HOW_IT_WORKS: readonly (StatusSymbol & { description: string })[] = [
  { ...STATUS_SYMBOLS.collecting, description: 'Steam counts playtime for the games you picked.' },
  { ...STATUS_SYMBOLS.cooling, description: 'Games take random breaks so their hours look natural.' },
  { ...STATUS_SYMBOLS.autoStart, description: 'Starts again by itself after a restart.' },
  { ...STATUS_SYMBOLS.noCooldown, description: 'One game can idle nonstop.' },
];
