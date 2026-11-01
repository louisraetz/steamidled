import { Item, ItemContent, ItemMedia } from '@/components/ui/item';
import { GameArt } from '@/components/game-art';
import type { GameDisplay } from '../types/game-display';
import { GameActions } from './game-actions';
import { GameMenu } from './game-menu';
import { GameName } from './game-name';
import { SessionGain } from './session-gain';
import { StatusLabel } from './status-label';

export function IdlingListItem({ game }: { game: GameDisplay }) {
  return (
    <Item size="list" role="listitem">
      <ItemMedia className="self-start">
        <GameArt appid={game.appid} name={game.name} size="sm" dimmed={game.dimmed} />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <GameName game={game} />
          <span className="-my-2.5 flex shrink-0">
            <GameMenu game={game} />
          </span>
        </div>
        <span className="flex text-sm">
          <StatusLabel status={game.status} detail={game.nextDetail} />
        </span>
        <div className="-mb-2 flex flex-wrap items-center gap-x-3">
          <span className="flex gap-2 font-mono text-sm">
            <span title={game.totalTitle}>{game.total}</span>
            <SessionGain value={game.session} counting={game.counting} />
          </span>
          <GameActions appid={game.appid} name={game.name} />
        </div>
      </ItemContent>
    </Item>
  );
}
