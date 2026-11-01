import type { ComponentType } from 'react';
import { Moon, Pause, Play } from 'lucide-react';
import type { Tone } from '@/components/tone';
import type { DisplayStatus } from '../types/game-display';

export const SCHEDULE_OFF_NEXT = 'No cooldown (schedule off)';

export const STATUS: Record<DisplayStatus, { icon: ComponentType<{ className?: string }>; label: string; tone: Tone }> = {
  idling: { icon: Play, label: 'Collecting', tone: 'success' },
  cooldown: { icon: Moon, label: 'Cooling down', tone: 'cooldown' },
  paused: { icon: Pause, label: 'Paused', tone: 'warning' },
};
