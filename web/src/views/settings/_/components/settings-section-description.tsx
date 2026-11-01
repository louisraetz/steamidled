import type { ReactNode } from 'react';

export function SettingsSectionDescription({ text }: { text?: ReactNode }) {
  if (!text) return null;
  return <p className="max-w-prose text-muted-foreground">{text}</p>;
}
