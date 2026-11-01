import { DropdownMenuItem, DropdownMenuShortcut } from '@/components/ui/dropdown-menu';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { COOLDOWN_PRESETS } from '../constants/menu';
import { useScheduleCommand } from '../hooks/use-schedule-command';
import type { GameDisplay } from '../types/game-display';

interface CoolDownOptionsProps {
  game: GameDisplay;
  disabled: boolean;
  inset: boolean;
  onCustom: () => void;
}

export function CoolDownOptions({ game, disabled, inset, onCustom }: CoolDownOptionsProps) {
  const range = useDaemonState(
    (snapshot) => `${snapshot.settings.schedule.cooldownMinHours}–${snapshot.settings.schedule.cooldownMaxHours}h`
  );
  const coolDown = useScheduleCommand('cooldown-now');
  const run = (hours: number | null) => coolDown.mutate({ appid: game.appid, name: game.name, hours });

  return (
    <>
      <DropdownMenuItem inset={inset} disabled={disabled} onSelect={() => run(null)}>
        Random
        <DropdownMenuShortcut className="font-mono tracking-normal">{range}</DropdownMenuShortcut>
      </DropdownMenuItem>
      {COOLDOWN_PRESETS.map((preset) => (
        <DropdownMenuItem key={preset.hours} inset={inset} disabled={disabled} onSelect={() => run(preset.hours)}>
          {preset.label}
        </DropdownMenuItem>
      ))}
      <DropdownMenuItem inset={inset} disabled={disabled} onSelect={onCustom}>
        Custom…
      </DropdownMenuItem>
    </>
  );
}
