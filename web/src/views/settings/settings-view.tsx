import { Page } from '@/components/page';
import { AccountSection } from './_/components/account-section';
import { HowItWorksSection } from './_/components/how-it-works-section';
import { LibrarySection } from './_/components/library-section';
import { ScheduleSection } from './_/components/schedule-section';
import { SessionSection } from './_/components/session-section';
import { SettingsFooter } from './_/components/settings-footer';
import { TelegramSection } from './_/components/telegram-section';

export function SettingsView() {
  return (
    <Page>
      <div className="flex max-w-xl flex-col gap-12">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <HowItWorksSection />
        <ScheduleSection />
        <SessionSection />
        <TelegramSection />
        <LibrarySection />
        <AccountSection />
        <SettingsFooter />
      </div>
    </Page>
  );
}
