import { GAME_GROUPS } from '../constants/groups';
import type { GameDisplay } from '../types/game-display';
import type { GameGroup } from '../types/game-group';

export function groupGames(games: GameDisplay[]): GameGroup[] {
  return GAME_GROUPS.map((group) => ({
    ...group,
    games: games.filter((game) => group.statuses.includes(game.status)),
  })).filter((group) => group.games.length > 0);
}
