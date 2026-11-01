import { Page } from '@/components/page';
import { SettingsPanelSkeleton } from './_/components/settings-panel-skeleton';
import { SettingsRailSkeleton } from './_/components/settings-rail-skeleton';

export function SettingsSkeleton() {
  return (
    <Page>
      <div aria-hidden="true" className="flex flex-col appear-delayed lg:flex-row lg:gap-16">
        <SettingsRailSkeleton />
        <SettingsPanelSkeleton />
      </div>
    </Page>
  );
}
