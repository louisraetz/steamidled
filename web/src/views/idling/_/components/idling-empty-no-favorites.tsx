import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { MAX_IDLE_GAMES } from '@/lib/constants';

export function IdlingEmptyNoFavorites() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Not idling</EmptyTitle>
        <EmptyDescription>Signed in and ready. Pick up to {MAX_IDLE_GAMES} games in Library.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/library">Choose games</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
