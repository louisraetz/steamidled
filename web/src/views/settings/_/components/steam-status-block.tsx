import { PersonaToggle } from './persona-toggle';
import { PresencePreview } from './presence-preview';
import { SettingsBlock } from './settings-block';
import { SettingsSplit } from './settings-split';

export function SteamStatusBlock() {
  return (
    <SettingsBlock title="Steam status" description="How friends see you while steamidled runs.">
      <SettingsSplit preview={<PresencePreview />}>
        <PersonaToggle />
      </SettingsSplit>
    </SettingsBlock>
  );
}
