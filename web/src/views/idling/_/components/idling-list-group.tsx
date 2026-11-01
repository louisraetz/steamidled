import { ItemGroup } from '@/components/ui/item';
import { GroupHeading } from '@/components/group-heading';
import type { GameGroup } from '../types/game-group';
import { IdlingListItem } from './idling-list-item';

export function IdlingListGroup({ group }: { group: GameGroup }) {
  return (
    <section aria-label={group.title} className="flex flex-col">
      <GroupHeading title={group.title} count={group.games.length} />
      <ItemGroup>
        {group.games.map((game) => (
          <IdlingListItem key={game.appid} game={game} />
        ))}
      </ItemGroup>
    </section>
  );
}
