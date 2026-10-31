import { formatPhase, pluralize } from '@/lib/format';
import type { GameDisplay } from '../types/game-display';
import type { SummaryPart } from '../types/summary-part';

export function summaryParts(games: GameDisplay[]): SummaryPart[] {
  const idling = games.filter((game) => game.status === 'idling' || game.status === 'exempt').length;
  const cooling = games.filter((game) => game.status === 'cooldown').length;
  const paused = games.filter((game) => game.status === 'paused').length;
  return [
    { count: idling, label: 'idling' },
    { count: cooling, label: 'cooling down' },
    { count: paused, label: 'paused' },
  ]
    .filter((part) => part.count > 0)
    .map((part, index) => ({ ...part, separator: index > 0 ? ', ' : '' }));
}

export function summaryMeta(idlingSince: number | null, gameCount: number, now: number): string {
  const selected = `${gameCount} ${pluralize(gameCount, 'game')} selected`;
  if (idlingSince === null) return selected;
  return `Up ${formatPhase(now - idlingSince)} · ${selected}`;
}
