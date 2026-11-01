import { Button } from '@/components/ui/button';
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
  const bot = props.botUsername ? `@${props.botUsername}` : 'your bot';
  return (
    <>
      <p className="max-w-prose">
        Messages go to {props.chatLabel ?? 'your chat'} via {bot}.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={props.disabled} onClick={props.onChangeBot}>
          Change bot
        </Button>
        <TurnOffDialog disabled={props.disabled} pending={props.turningOff} onConfirm={props.onTurnOff} />
      </div>
      <TelegramPreferences disabled={props.disabled} />
    </>
  );
}
