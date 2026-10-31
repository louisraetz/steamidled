import { STATUS_RANK } from '../constants/status';
import type { GameDisplay } from '../types/game-display';

export function sortGames(games: GameDisplay[]): GameDisplay[] {
  return [...games].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.name.localeCompare(b.name));
}
