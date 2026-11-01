import { Button } from '@/components/ui/button';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useIdlingActions } from '../hooks/use-idling-actions';

export function StateAlertRetry({ label }: { label: string | null }) {
  const canMutate = useCanMutate();
  const { retry } = useIdlingActions();
  if (!label) return null;

  return (
    <Button variant="outline" size="sm" disabled={!canMutate} pending={retry.isPending} onClick={() => retry.mutate()}>
      {label}
    </Button>
  );
}
