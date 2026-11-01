import { SHARED_TOTAL_TITLE } from '@/lib/constants';
import { formatPlaytimeMinutes } from '@/lib/format';
import type { LibraryGame } from '@/lib/types';

import type { RowTotal } from '../types/row-total';

export function rowTotal(game: LibraryGame): RowTotal {
  if (game.playtimeMinutes === null) return { text: '', title: SHARED_TOTAL_TITLE, className: '' };
  if (game.playtimeMinutes === 0) return { text: 'Never played', title: undefined, className: 'text-tertiary' };
  return { text: formatPlaytimeMinutes(game.playtimeMinutes), title: undefined, className: 'font-mono' };
}
