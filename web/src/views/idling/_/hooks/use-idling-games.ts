import { useNow } from '@/hooks/use-now';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { describeGame } from '../helpers/describe-game';
import { sortGames } from '../helpers/sort-games';
import type { GameDisplay } from '../types/game-display';

export function useIdlingGames(): GameDisplay[] {
  const now = useNow();
  return (
    useDaemonState((snapshot) =>
      sortGames(
        snapshot.games.map((game) => describeGame(game, snapshot.connection, snapshot.serverTime, now))
      )
    ) ?? []
  );
}
