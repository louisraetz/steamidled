import type { ReactNode } from 'react';
import { SettingsSectionDescription } from './settings-section-description';

interface SettingsPanelProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsPanel({ title, description, children }: SettingsPanelProps) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <SettingsSectionDescription text={description} />
      </div>
      <div className="flex flex-col gap-10">{children}</div>
    </section>
  );
}
