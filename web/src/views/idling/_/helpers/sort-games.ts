import type { GameDisplay } from '../types/game-display';

export function sortGames(games: GameDisplay[]): GameDisplay[] {
  return [...games].sort((a, b) => a.name.localeCompare(b.name));
}
