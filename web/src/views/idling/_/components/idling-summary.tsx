import type { GameDisplay } from '../types/game-display';
import { IdlingActions } from './idling-actions';
import { IdlingHeading } from './idling-heading';
import { IdlingHero } from './idling-hero';

export function IdlingSummary({ games }: { games: GameDisplay[] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
      <IdlingHeading games={games} />
      <IdlingActions gameCount={games.length} />
      <IdlingHero />
    </div>
  );
}
