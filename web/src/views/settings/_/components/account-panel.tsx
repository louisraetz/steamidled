import { AccountRow } from './account-row';
import { HowItWorksBlock } from './how-it-works-block';
import { LibraryBlock } from './library-block';
import { SettingsFooter } from './settings-footer';
import { SettingsPanel } from './settings-panel';

export function AccountPanel() {
  return (
    <SettingsPanel title="Account" description="Your Steam account and its games.">
      <AccountRow />
      <LibraryBlock />
      <HowItWorksBlock />
      <SettingsFooter />
    </SettingsPanel>
  );
}
