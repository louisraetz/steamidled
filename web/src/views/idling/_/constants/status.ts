import type { ComponentType } from 'react';
import { Hourglass, Infinity as InfinityIcon, Pause, Play } from 'lucide-react';
import type { Tone } from '@/components/tone';
import type { DisplayStatus } from '../types/game-display';

export const STATUS: Record<DisplayStatus, { icon: ComponentType<{ className?: string }>; label: string; tone: Tone }> = {
  idling: { icon: Play, label: 'Idling', tone: 'success' },
  exempt: { icon: InfinityIcon, label: 'Exempt', tone: 'success' },
  cooldown: { icon: Hourglass, label: 'Cooldown', tone: 'subtle' },
  paused: { icon: Pause, label: 'Paused', tone: 'warning' },
};

export const STATUS_RANK: Record<DisplayStatus, number> = { idling: 0, exempt: 0, paused: 1, cooldown: 2 };
