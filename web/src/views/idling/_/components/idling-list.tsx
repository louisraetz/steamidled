import { ItemGroup } from '@/components/ui/item';
import type { GameDisplay } from '../types/game-display';
import { IdlingListItem } from './idling-list-item';

export function IdlingList({ games }: { games: GameDisplay[] }) {
  return (
    <ItemGroup className="divide-y">
      {games.map((game) => (
        <IdlingListItem key={game.appid} game={game} />
      ))}
    </ItemGroup>
  );
}
