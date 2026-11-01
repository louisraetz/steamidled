import { Play, Timer } from 'lucide-react';
import { DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useScheduleCommand } from '../hooks/use-schedule-command';
import type { ScheduleItemsProps } from '../types/schedule-items-props';

export function CoolingItems({ game, onOpenDialog }: ScheduleItemsProps) {
  const endCooldown = useScheduleCommand('end-cooldown');

  return (
    <DropdownMenuGroup>
      <DropdownMenuItem onSelect={() => endCooldown.mutate({ appid: game.appid, name: game.name, hours: null })}>
        <Play />
        End cooldown now
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onOpenDialog('cooldown-remaining')}>
        <Timer />
        Change remaining cooldown…
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}
