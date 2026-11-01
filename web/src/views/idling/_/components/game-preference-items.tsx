import { X } from 'lucide-react';
import { DropdownMenuCheckboxItem, DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useGamePreferences } from '@/hooks/use-game-preferences';
import { useSelectionLock } from '@/hooks/use-selection-lock';
import { removeGame } from '../helpers/remove-game';
import type { GameDisplay } from '../types/game-display';

export function GamePreferenceItems({ game }: { game: GameDisplay }) {
  const preferences = useGamePreferences();
  const selectionLock = useSelectionLock();

  return (
    <DropdownMenuGroup>
      <DropdownMenuCheckboxItem
        checked={preferences.favorites.includes(game.appid)}
        disabled={preferences.locked}
        onCheckedChange={() => preferences.toggleFavorite(game.appid)}
      >
        Auto-start
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={preferences.exemptAppId === game.appid}
        disabled={preferences.locked}
        onCheckedChange={() => preferences.toggleExempt(game.appid)}
      >
        No cooldown
      </DropdownMenuCheckboxItem>
      <DropdownMenuItem
        variant="destructive"
        disabled={selectionLock !== null}
        onSelect={() => removeGame(game.appid, game.name)}
      >
        <X />
        Remove
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}
