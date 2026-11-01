import { Table, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { GameGroup } from '../types/game-group';
import { IdlingTableGroup } from './idling-table-group';

export function IdlingTable({ groups }: { groups: GameGroup[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Game</TableHead>
          <TableHead className="hidden lg:table-cell">Status</TableHead>
          <TableHead className="hidden lg:table-cell">Next</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">This session</TableHead>
          <TableHead className="pl-4">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      {groups.map((group) => (
        <IdlingTableGroup key={group.key} group={group} />
      ))}
    </Table>
  );
}
