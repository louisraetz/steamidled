import { Moon } from 'lucide-react';
import { DropdownMenuGroup, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import type { GameDisplay } from '../types/game-display';
import { CoolDownOptions } from './cool-down-options';

interface CoolDownInlineProps {
  game: GameDisplay;
  disabled: boolean;
  onCustom: () => void;
}

export function CoolDownInline({ game, disabled, onCustom }: CoolDownInlineProps) {
  return (
    <DropdownMenuGroup className="sm:hidden">
      <DropdownMenuLabel className="flex items-center gap-2 text-base text-foreground">
        <Moon className="size-5 text-muted-foreground" />
        Cool down now
      </DropdownMenuLabel>
      <CoolDownOptions game={game} disabled={disabled} inset onCustom={onCustom} />
    </DropdownMenuGroup>
  );
}
