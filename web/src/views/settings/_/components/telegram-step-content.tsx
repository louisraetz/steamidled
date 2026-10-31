import { useCanMutate } from '@/hooks/use-can-mutate';
import { errorMessage } from '../helpers/error-message';
import { useTelegramActions } from '../hooks/use-telegram-actions';
import { useTelegramStep } from '../hooks/use-telegram-step';
import { TelegramConnected } from './telegram-connected';
import { TelegramOff } from './telegram-off';
import { TelegramTokenForm } from './telegram-token-form';
import { TelegramWaiting } from './telegram-waiting';

export function TelegramStepContent() {
  const canMutate = useCanMutate();
  const flow = useTelegramStep();
  const actions = useTelegramActions(flow.stopEditing);

  if (flow.step === 'waiting') {
    return (
      <TelegramWaiting
        botUsername={flow.botUsername ?? 'your_bot'}
        cancelling={actions.disable.isPending}
        onCancel={() => actions.disable.mutate()}
      />
    );
  }
  if (flow.step === 'token') {
    return (
      <TelegramTokenForm
        pending={actions.submitToken.isPending}
        disabled={!canMutate}
        serverError={errorMessage(actions.submitToken.error)}
        onSubmit={(token) => actions.submitToken.mutate(token)}
        onCancel={() => {
          actions.submitToken.reset();
          flow.stopEditing();
        }}
      />
    );
  }
  if (flow.step === 'connected') {
    return (
      <TelegramConnected
        botUsername={flow.botUsername}
        chatLabel={flow.chatLabel}
        disabled={!canMutate}
        turningOff={actions.disable.isPending}
        onChangeBot={flow.startEditing}
        onTurnOff={() => actions.disable.mutate()}
      />
    );
  }
  return <TelegramOff disabled={!canMutate} onConnect={flow.startEditing} />;
}
