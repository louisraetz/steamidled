import { summaryParts } from '../helpers/summary';
import type { GameDisplay } from '../types/game-display';

export function IdlingHeading({ games }: { games: GameDisplay[] }) {
  return (
    <h1 className="w-full text-lg font-semibold sm:w-auto">
      {summaryParts(games).map((part) => (
        <span key={part.label}>
          {part.separator}
          <span className="font-mono font-normal">{part.count}</span> {part.label}
        </span>
      ))}
    </h1>
  );
}
