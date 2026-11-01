import type { ComponentType } from 'react';
import type { TextPart } from '@/lib/text-parts';

export interface StateAlertContent {
  variant: 'default' | 'destructive';
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: TextPart[];
  retryLabel: string | null;
}
