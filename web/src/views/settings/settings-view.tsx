import { Page } from '@/components/page';
import { AccountSection } from './_/components/account-section';
import { SettingsFooter } from './_/components/settings-footer';
import { TelegramSection } from './_/components/telegram-section';

export function SettingsView() {
  return (
    <Page>
      <div className="flex max-w-xl flex-col gap-10">
        <h1 className="text-xl font-semibold">Settings</h1>
        <TelegramSection />
        <AccountSection />
        <SettingsFooter />
      </div>
    </Page>
  );
}
