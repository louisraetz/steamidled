import { Button } from '@/components/ui/button';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useIdlingActions } from '../hooks/use-idling-actions';

export function StateAlertRetry({ visible }: { visible: boolean }) {
  const canMutate = useCanMutate();
  const { retry } = useIdlingActions();
  if (!visible) return null;

  return (
    <Button variant="outline" size="sm" disabled={!canMutate} pending={retry.isPending} onClick={() => retry.mutate()}>
      Try again
    </Button>
  );
}
