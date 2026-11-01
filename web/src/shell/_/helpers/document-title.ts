import { formatGain } from '@/lib/format';
import { APP_TITLE } from '../constants/title';

export function documentTitle(disconnected: boolean, counting: number, gainedMs: number): string {
  if (disconnected) return `Disconnected · ${APP_TITLE}`;
  if (counting > 0) return `${formatGain(gainedMs)} · ${APP_TITLE}`;
  return APP_TITLE;
}
