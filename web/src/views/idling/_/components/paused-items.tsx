import { Moon, Timer } from 'lucide-react';
import { DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { PAUSED_REASON } from '../constants/menu';
import { MenuReason } from './menu-reason';

export function PausedItems() {
  return (
    <DropdownMenuGroup>
      <DropdownMenuItem disabled>
        <Moon />
        Cool down now
      </DropdownMenuItem>
      <DropdownMenuItem disabled>
        <Timer />
        Next cooldown in…
      </DropdownMenuItem>
      <MenuReason text={PAUSED_REASON} />
    </DropdownMenuGroup>
  );
}
