import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GameDisplay } from '../types/game-display';
import { SessionGain } from './session-gain';

export function SessionGainTooltip({ game }: { game: GameDisplay }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <SessionGain value={game.session} counting={game.counting} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{game.todayTitle}</TooltipContent>
    </Tooltip>
  );
}
