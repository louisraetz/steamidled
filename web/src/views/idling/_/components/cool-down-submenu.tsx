import { Moon } from 'lucide-react';
import { DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import type { GameDisplay } from '../types/game-display';
import { CoolDownOptions } from './cool-down-options';

interface CoolDownSubmenuProps {
  game: GameDisplay;
  disabled: boolean;
  onCustom: () => void;
}

export function CoolDownSubmenu({ game, disabled, onCustom }: CoolDownSubmenuProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled} className="max-sm:hidden">
        <Moon />
        Cool down now
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <CoolDownOptions game={game} disabled={false} inset={false} onCustom={onCustom} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
