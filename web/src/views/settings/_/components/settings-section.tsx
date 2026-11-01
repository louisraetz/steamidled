import type { ReactNode } from 'react';
import { SettingsSectionDescription } from './settings-section-description';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <SettingsSectionDescription text={description} />
      </div>
      {children}
    </section>
  );
}
