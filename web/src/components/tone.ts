export type Tone = 'success' | 'warning' | 'destructive' | 'neutral' | 'subtle';

export const toneClass: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  neutral: 'text-muted-foreground',
  subtle: 'text-tertiary',
};
