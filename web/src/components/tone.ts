export type Tone = 'success' | 'warning' | 'destructive' | 'cooldown' | 'neutral' | 'subtle';

export const toneClass: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  cooldown: 'text-cooldown',
  neutral: 'text-muted-foreground',
  subtle: 'text-tertiary',
};
