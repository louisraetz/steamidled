import { STATUS_GROUP } from '../constants/groups';
import type { GameDisplay } from '../types/game-display';
import type { GameGroupKey } from '../types/game-group';
import type { SummaryPart } from '../types/summary-part';

function countGroup(games: GameDisplay[], key: GameGroupKey): number {
  return games.filter((game) => STATUS_GROUP[game.status].key === key).length;
}

export function summaryParts(games: GameDisplay[]): SummaryPart[] {
  return [
    { count: countGroup(games, 'collecting'), label: 'collecting' },
    { count: countGroup(games, 'cooldown'), label: 'cooling down' },
    { count: countGroup(games, 'paused'), label: 'paused' },
  ]
    .filter((part) => part.count > 0)
    .map((part, index) => ({ ...part, separator: index > 0 ? ', ' : '' }));
}
