import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RichText } from '@/components/rich-text';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useNow } from '@/hooks/use-now';
import { stateAlertContent } from '../helpers/state-alert-content';
import { StateAlertRetry } from './state-alert-retry';

export function StateAlert() {
  const now = useNow();
  const content = useDaemonState((snapshot) => stateAlertContent(snapshot, now));
  if (!content) return null;
  const Icon = content.icon;

  return (
    <Alert variant={content.variant}>
      <Icon />
      <AlertTitle>{content.title}</AlertTitle>
      <AlertDescription>
        <p>
          <RichText parts={content.body} />
        </p>
        <StateAlertRetry visible={content.retry} />
      </AlertDescription>
    </Alert>
  );
}
