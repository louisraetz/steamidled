import { TableBody, TableHead, TableRow } from '@/components/ui/table';
import { GroupLabel } from '@/components/group-label';
import { IDLING_TABLE_COLUMNS } from '../constants/table';
import type { GameGroup } from '../types/game-group';
import { IdlingTableRow } from './idling-table-row';

export function IdlingTableGroup({ group }: { group: GameGroup }) {
  return (
    <TableBody>
      <TableRow>
        <TableHead scope="rowgroup" colSpan={IDLING_TABLE_COLUMNS} className="align-bottom font-semibold">
          <span className="flex items-end gap-2 pb-1 text-sm">
            <GroupLabel title={group.title} count={group.games.length} />
          </span>
        </TableHead>
      </TableRow>
      {group.games.map((game) => (
        <IdlingTableRow key={game.appid} game={game} />
      ))}
    </TableBody>
  );
}
