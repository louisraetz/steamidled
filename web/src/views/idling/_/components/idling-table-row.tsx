import { TableCell, TableRow } from '@/components/ui/table';
import type { GameDisplay } from '../types/game-display';
import { StatusLabel } from './status-label';

export function IdlingTableRow({ game }: { game: GameDisplay }) {
  return (
    <TableRow>
      <TableCell className="w-full max-w-0">
        <div className="truncate" title={game.name}>
          {game.name}
        </div>
      </TableCell>
      <TableCell>
        <StatusLabel status={game.status} detail={game.statusDetail} detailClassName="lg:hidden" />
      </TableCell>
      <TableCell className="hidden text-muted-foreground lg:table-cell">{game.next}</TableCell>
      <TableCell className="text-right font-mono" title={game.totalTitle}>
        {game.total}
      </TableCell>
      <TableCell className="text-right font-mono">{game.session}</TableCell>
    </TableRow>
  );
}
