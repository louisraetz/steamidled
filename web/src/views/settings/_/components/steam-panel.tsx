import { CommitBlock } from './commit-block';
import { SettingsPanel } from './settings-panel';
import { SteamConnectionAlert } from './steam-connection-alert';
import { SteamStatusBlock } from './steam-status-block';
import { WatchdogSwitch } from './watchdog-switch';

export function SteamPanel() {
  return (
    <SettingsPanel title="Steam" description="How steamidled shows up and stays signed in.">
      <SteamConnectionAlert />
      <SteamStatusBlock />
      <CommitBlock />
      <WatchdogSwitch />
    </SettingsPanel>
  );
}
