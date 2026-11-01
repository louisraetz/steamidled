import type { GameDisplay } from '../types/game-display';

export function GameName({ game }: { game: GameDisplay }) {
  return (
    <span data-dimmed={game.dimmed} className="min-w-0 truncate data-[dimmed=true]:text-muted-foreground" title={game.name}>
      {game.name}
    </span>
  );
}
