import { toast } from 'sonner';
import { UNDO_DURATION_MS } from '@/lib/constants';
import { withGame, withoutGame } from '@/lib/selection';
import { updateSelection } from '@/lib/selection-sync';

export function removeGame(appid: number, name: string): void {
  if (!updateSelection((appIds) => withoutGame(appIds, appid))) return;
  toast(`Removed ${name}`, {
    duration: UNDO_DURATION_MS,
    action: { label: 'Undo', onClick: () => updateSelection((appIds) => withGame(appIds, appid)) },
  });
}
