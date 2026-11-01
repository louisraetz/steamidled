import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { IdleMascot } from '@/components/idle-mascot';

export function LibraryAccountEmpty() {
  return (
    <Empty>
      <EmptyMedia>
        <IdleMascot variant="awake" className="size-24" />
      </EmptyMedia>
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
