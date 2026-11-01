import type { ReactNode } from 'react';

interface SettingsSplitProps {
  preview: ReactNode;
  children: ReactNode;
}

export function SettingsSplit({ preview, children }: SettingsSplitProps) {
  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
      <div className="min-w-0">{preview}</div>
    </div>
  );
}
