import { useId, type ReactNode } from 'react';
import { SettingsSectionDescription } from './settings-section-description';

interface SettingsBlockProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

export function SettingsBlock({ title, description, children }: SettingsBlockProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="text-base font-semibold">
          {title}
        </h3>
        <SettingsSectionDescription text={description} />
      </div>
      {children}
    </section>
  );
}
