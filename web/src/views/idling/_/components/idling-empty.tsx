import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useIdlingActions } from '../hooks/use-idling-actions';
import { IdlingEmptyNoFavorites } from './idling-empty-no-favorites';

export function IdlingEmpty() {
  const favorites = useDaemonState((snapshot) => snapshot.favoritesInLibrary) ?? 0;
  const canMutate = useCanMutate();
  const { startFavorites } = useIdlingActions();
  if (favorites === 0) return <IdlingEmptyNoFavorites />;

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Not idling</EmptyTitle>
        <EmptyDescription>
          Signed in and ready. Start your {favorites} favorites or pick games in Library.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button disabled={!canMutate} pending={startFavorites.isPending} onClick={() => startFavorites.mutate()}>
          Start favorites
        </Button>
        <Button variant="outline" asChild>
          <Link href="/library">Choose games</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
