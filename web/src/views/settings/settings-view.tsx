import { Redirect } from 'wouter';
import { Page } from '@/components/page';
import { Tabs } from '@/components/ui/tabs';
import { AccountPanel } from './_/components/account-panel';
import { SchedulePanel } from './_/components/schedule-panel';
import { SettingsPanelContent } from './_/components/settings-panel-content';
import { SettingsRail } from './_/components/settings-rail';
import { SteamPanel } from './_/components/steam-panel';
import { TelegramPanel } from './_/components/telegram-panel';
import { DEFAULT_SECTION } from './_/constants/sections';
import { sectionPath } from './_/helpers/settings-section';
import { useRailOrientation } from './_/hooks/use-rail-orientation';
import { useSettingsSection } from './_/hooks/use-settings-section';

export function SettingsView() {
  const { section, leaving, select } = useSettingsSection();
  const orientation = useRailOrientation();
  if (leaving) return null;
  if (!section) return <Redirect to={sectionPath(DEFAULT_SECTION)} replace />;

  return (
    <Page>
      <h1 className="sr-only">Settings</h1>
      <Tabs value={section} onValueChange={select} orientation={orientation} className="gap-0 lg:gap-16">
        <SettingsRail />
        <SettingsPanelContent value="schedule">
          <SchedulePanel />
        </SettingsPanelContent>
        <SettingsPanelContent value="steam">
          <SteamPanel />
        </SettingsPanelContent>
        <SettingsPanelContent value="telegram">
          <TelegramPanel />
        </SettingsPanelContent>
        <SettingsPanelContent value="account">
          <AccountPanel />
        </SettingsPanelContent>
      </Tabs>
    </Page>
  );
}
