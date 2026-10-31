import { Item, ItemContent } from '@/components/ui/item';
import type { GameDisplay } from '../types/game-display';
import { StatusLabel } from './status-label';

export function IdlingListItem({ game }: { game: GameDisplay }) {
  return (
    <Item size="list" role="listitem">
      <ItemContent className="min-w-0 gap-0.5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="truncate" title={game.name}>
            {game.name}
          </span>
          <span className="shrink-0 font-mono" title={game.totalTitle}>
            {game.total}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-xs">
          <StatusLabel status={game.status} detail={game.nextDetail} />
          <span className="shrink-0 font-mono text-muted-foreground">{game.session}</span>
        </div>
      </ItemContent>
    </Item>
  );
}
