import type { ComponentType } from 'react';
import type { Tone } from '@/components/tone';
import type { TextPart } from '@/lib/text-parts';

export interface ConnectionDisplay {
  tone: Tone;
  icon: ComponentType<{ className?: string }>;
  label: TextPart[];
  shortLabel: TextPart[];
}
