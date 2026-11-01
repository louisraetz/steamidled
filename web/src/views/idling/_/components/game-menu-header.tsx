import { DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import type { GameDisplay } from '../types/game-display';

export function GameMenuHeader({ game }: { game: GameDisplay }) {
  return (
    <DropdownMenuLabel>
      <span className="block truncate text-base font-semibold text-foreground">{game.name}</span>
      <span>
        <span className="font-mono">{game.today}</span> today · <span className="font-mono">{game.session}</span> this
        session
      </span>
    </DropdownMenuLabel>
  );
}
