import { Ellipsis } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { MORE_ACTIONS_TOOLTIP } from '../constants/actions';
import { useScheduleDialog } from '../hooks/use-schedule-dialog';
import type { GameDisplay } from '../types/game-display';
import { GameMenuHeader } from './game-menu-header';
import { GamePreferenceItems } from './game-preference-items';
import { GameScheduleItems } from './game-schedule-items';
import { ScheduleDialog } from './schedule-dialog';

export function GameMenu({ game }: { game: GameDisplay }) {
  const canMutate = useCanMutate();
  const dialog = useScheduleDialog();

  return (
    <>
      <DropdownMenu modal={false}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                ref={dialog.triggerRef}
                data-menu-for={game.appid}
                variant="quiet"
                size="icon-sm"
                aria-label={`More actions for ${game.name}`}
                disabled={!canMutate}
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{MORE_ACTIONS_TOOLTIP}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-72">
          <GameMenuHeader game={game} />
          <DropdownMenuSeparator />
          <GameScheduleItems game={game} onOpenDialog={dialog.show} />
          <DropdownMenuSeparator />
          <GamePreferenceItems game={game} />
        </DropdownMenuContent>
      </DropdownMenu>
      <ScheduleDialog
        game={game}
        state={dialog.state}
        onOpenChange={dialog.changeOpen}
        onDone={dialog.close}
        onCloseAutoFocus={dialog.returnFocus}
      />
    </>
  );
}
