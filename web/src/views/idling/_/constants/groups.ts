import type { DisplayStatus } from '../types/game-display';
import type { GameGroupDefinition } from '../types/game-group';

export const GAME_GROUPS: GameGroupDefinition[] = [
  { key: 'collecting', title: 'Collecting', statuses: ['idling'], dimmed: false },
  { key: 'paused', title: 'Paused', statuses: ['paused'], dimmed: true },
  { key: 'cooldown', title: 'Cooling down', statuses: ['cooldown'], dimmed: true },
];

export const STATUS_GROUP = Object.fromEntries(
  GAME_GROUPS.flatMap((group) => group.statuses.map((status) => [status, group]))
) as Record<DisplayStatus, GameGroupDefinition>;
