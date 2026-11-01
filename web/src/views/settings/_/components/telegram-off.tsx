import { Button } from '@/components/ui/button';
import { SettingsSplit } from './settings-split';
import { TelegramOffPreview } from './telegram-off-preview';

export function TelegramOff({ disabled, onConnect }: { disabled: boolean; onConnect: () => void }) {
  return (
    <SettingsSplit preview={<TelegramOffPreview />}>
      <p className="max-w-prose text-muted-foreground">
        Get a message when idling stops or resumes, plus a daily report.
      </p>
      <div>
        <Button disabled={disabled} onClick={onConnect}>
          Connect a bot
        </Button>
      </div>
    </SettingsSplit>
  );
}
