import { formatCount } from '@/lib/format';
import { mono, plain, type TextPart } from '@/lib/text-parts';
import { WINDOW_DAYS, WINDOW_HOURS } from '../constants/cycle-chart';

export function cooldownHintBody(): TextPart[] {
  return [
    plain('Idling nonstop gives every game the same hours, like '),
    mono(`+${formatCount(WINDOW_HOURS)}h`),
    plain(
      ` each after ${WINDOW_DAYS} days. Random breaks humanize your playtime: each game ends up with its own believable total, as if you really played it.`
    ),
  ];
}
