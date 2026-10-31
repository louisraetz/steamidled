import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { GameDisplay } from '../types/game-display';
import { IdlingTableRow } from './idling-table-row';

export function IdlingTable({ games }: { games: GameDisplay[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Game</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden lg:table-cell">Next</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">This session</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {games.map((game) => (
          <IdlingTableRow key={game.appid} game={game} />
        ))}
      </TableBody>
    </Table>
  );
}
