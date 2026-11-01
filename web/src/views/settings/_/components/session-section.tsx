import { FlushIntervalSelect } from './flush-interval-select';
import { PersonaSelect } from './persona-select';
import { SessionActions } from './session-actions';
import { SettingsSection } from './settings-section';
import { WatchdogSwitch } from './watchdog-switch';

export function SessionSection() {
  return (
    <SettingsSection title="Session" description="How steamidled stays signed in to Steam.">
      <PersonaSelect />
      <FlushIntervalSelect />
      <WatchdogSwitch />
      <SessionActions />
    </SettingsSection>
  );
}
