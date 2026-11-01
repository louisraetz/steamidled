import { SettingsPanel } from './settings-panel';
import { TelegramStepContent } from './telegram-step-content';

export function TelegramPanel() {
  return (
    <SettingsPanel title="Telegram" description="Messages from steamidled to your phone.">
      <TelegramStepContent />
    </SettingsPanel>
  );
}
