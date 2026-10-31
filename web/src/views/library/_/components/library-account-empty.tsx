import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

export function LibraryAccountEmpty() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No games on this account</EmptyTitle>
        <EmptyDescription>
          Owned games, free games you've played and games shared through Steam Families appear here. New games
          show up after restarting steamidled.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
