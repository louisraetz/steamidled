import type { GameDisplay } from './game-display';
import type { ScheduleDialogMode } from './schedule-dialog';

export interface ScheduleItemsProps {
  game: GameDisplay;
  onOpenDialog: (mode: ScheduleDialogMode) => void;
}
