import { Button } from '@/components/ui/button';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useIdlingActions } from '../hooks/use-idling-actions';

export function StartAutoStartButton({ count }: { count: number }) {
  const canMutate = useCanMutate();
  const { startFavorites } = useIdlingActions();
  if (count === 0) return null;

  return (
    <Button
      variant="outline"
      disabled={!canMutate}
      pending={startFavorites.isPending}
      onClick={() => startFavorites.mutate()}
    >
      Start auto-start games ({count})
    </Button>
  );
}
