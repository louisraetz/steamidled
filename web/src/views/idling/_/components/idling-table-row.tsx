import { TableCell, TableRow } from '@/components/ui/table';
import { GameArt } from '@/components/game-art';
import type { GameDisplay } from '../types/game-display';
import { GameActions } from './game-actions';
import { GameMenu } from './game-menu';
import { GameName } from './game-name';
import { SessionGainTooltip } from './session-gain-tooltip';
import { StatusLabel } from './status-label';

export function IdlingTableRow({ game }: { game: GameDisplay }) {
  return (
    <TableRow className="h-14">
      <TableCell className="w-full max-w-0">
        <div className="flex items-center gap-3">
          <GameArt appid={game.appid} name={game.name} size="md" dimmed={game.dimmed} />
          <div className="flex min-w-0 flex-col">
            <GameName game={game} />
            <span className="flex text-sm lg:hidden">
              <StatusLabel status={game.status} detail={game.nextDetail} />
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <StatusLabel status={game.status} />
      </TableCell>
      <TableCell className="hidden text-muted-foreground lg:table-cell">{game.next}</TableCell>
      <TableCell className="text-right font-mono" title={game.totalTitle}>
        {game.total}
      </TableCell>
      <TableCell className="text-right">
        <SessionGainTooltip game={game} />
      </TableCell>
      <TableCell className="pl-4">
        <GameActions appid={game.appid} name={game.name}>
          <GameMenu game={game} />
        </GameActions>
      </TableCell>
    </TableRow>
  );
}
