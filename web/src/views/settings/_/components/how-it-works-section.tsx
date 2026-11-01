import { SettingsSection } from './settings-section';

export function HowItWorksSection() {
  return (
    <SettingsSection title="How it works">
      <p className="max-w-prose text-muted-foreground">
        steamidled tells Steam you are playing the games you picked, so their playtime grows. Games take random breaks
        (cooldowns) so the hours look natural. Auto-start games start again after a restart.
      </p>
    </SettingsSection>
  );
}
