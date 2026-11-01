import type { DisplayStatus, GameDisplay } from './game-display';

export type GameGroupKey = 'collecting' | 'paused' | 'cooldown';

export interface GameGroupDefinition {
  key: GameGroupKey;
  title: string;
  statuses: DisplayStatus[];
  dimmed: boolean;
}

export interface GameGroup extends GameGroupDefinition {
  games: GameDisplay[];
}
