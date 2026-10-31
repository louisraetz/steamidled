import { SettingsSection } from './settings-section';
import { TelegramStepContent } from './telegram-step-content';

export function TelegramSection() {
  return (
    <SettingsSection title="Telegram notifications">
      <TelegramStepContent />
    </SettingsSection>
  );
}
