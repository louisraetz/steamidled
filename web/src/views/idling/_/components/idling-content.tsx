import { useContentKind } from '../hooks/use-content-kind';
import { useIdlingGames } from '../hooks/use-idling-games';
import { IdlingEmpty } from './idling-empty';
import { IdlingList } from './idling-list';
import { IdlingSkeleton } from './idling-skeleton';
import { IdlingSummary } from './idling-summary';
import { IdlingTable } from './idling-table';

export function IdlingContent() {
  const games = useIdlingGames();
  const kind = useContentKind(games.length);
  if (kind === 'loading') return <IdlingSkeleton />;
  if (kind === 'empty') return <IdlingEmpty />;
  if (kind === 'none') return null;

  return (
    <div className="flex flex-col gap-6">
      <IdlingSummary games={games} />
      <div className="hidden sm:block">
        <IdlingTable games={games} />
      </div>
      <div className="sm:hidden">
        <IdlingList games={games} />
      </div>
    </div>
  );
}
