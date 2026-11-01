import { EXEMPT_REASON, SCHEDULE_OFF_REASON } from '../constants/menu';
import type { GameDisplay } from '../types/game-display';
import type { MenuReasons } from '../types/menu-reasons';

export function collectingReasons(game: GameDisplay, scheduleEnabled: boolean): MenuReasons {
  if (game.exempt) return { coolDownDisabled: true, nextDisabled: true, note: EXEMPT_REASON };
  if (!scheduleEnabled) return { coolDownDisabled: false, nextDisabled: true, note: SCHEDULE_OFF_REASON };
  return { coolDownDisabled: false, nextDisabled: false, note: null };
}
