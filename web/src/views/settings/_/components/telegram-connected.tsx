import { Button } from '@/components/ui/button';
import { botHandle } from '../helpers/bot-handle';
import { SettingsSplit } from './settings-split';
import { TelegramChatColumn } from './telegram-chat-column';
import { TelegramPreferences } from './telegram-preferences';
import { TurnOffDialog } from './turn-off-dialog';

interface TelegramConnectedProps {
  botUsername: string | null;
  chatLabel: string | null;
  disabled: boolean;
  turningOff: boolean;
  onChangeBot: () => void;
  onTurnOff: () => void;
}

export function TelegramConnected(props: TelegramConnectedProps) {
  const bot = props.botUsername ? botHandle(props.botUsername) : 'your bot';
  return (
    <SettingsSplit preview={<TelegramChatColumn botUsername={props.botUsername} disabled={props.disabled} />}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="max-w-prose wrap-break-word">
            Messages go to {props.chatLabel ?? 'your chat'} via {bot}.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={props.disabled} onClick={props.onChangeBot}>
              Change bot
            </Button>
            <TurnOffDialog disabled={props.disabled} pending={props.turningOff} onConfirm={props.onTurnOff} />
          </div>
        </div>
        <TelegramPreferences disabled={props.disabled} />
      </div>
    </SettingsSplit>
  );
}
