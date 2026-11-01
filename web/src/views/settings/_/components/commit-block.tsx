import { CommitNowButton } from './commit-now-button';
import { CommitPreview } from './commit-preview';
import { FlushIntervalToggle } from './flush-interval-toggle';
import { SettingsBlock } from './settings-block';
import { SettingsSplit } from './settings-split';

export function CommitBlock() {
  return (
    <SettingsBlock title="Commit playtime" description="steamidled briefly reconnects so Steam saves the hours.">
      <SettingsSplit preview={<CommitPreview />}>
        <FlushIntervalToggle />
        <CommitNowButton />
      </SettingsSplit>
    </SettingsBlock>
  );
}
