import { Timer } from 'lucide-react';
import { DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { collectingReasons } from '../helpers/menu-reasons';
import type { ScheduleItemsProps } from '../types/schedule-items-props';
import { CoolDownInline } from './cool-down-inline';
import { CoolDownSubmenu } from './cool-down-submenu';
import { MenuReason } from './menu-reason';

export function CollectingItems({ game, onOpenDialog }: ScheduleItemsProps) {
  const scheduleEnabled = useDaemonState((snapshot) => snapshot.settings.schedule.enabled) ?? true;
  const reasons = collectingReasons(game, scheduleEnabled);

  return (
    <DropdownMenuGroup>
      <CoolDownSubmenu game={game} disabled={reasons.coolDownDisabled} onCustom={() => onOpenDialog('cooldown-now')} />
      <CoolDownInline game={game} disabled={reasons.coolDownDisabled} onCustom={() => onOpenDialog('cooldown-now')} />
      <DropdownMenuItem disabled={reasons.nextDisabled} onSelect={() => onOpenDialog('next-cooldown')}>
        <Timer />
        Next cooldown in…
      </DropdownMenuItem>
      <MenuReason text={reasons.note} />
    </DropdownMenuGroup>
  );
}
