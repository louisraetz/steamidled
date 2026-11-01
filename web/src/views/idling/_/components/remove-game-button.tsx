import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { REMOVE_TOOLTIP } from '../constants/actions';

interface RemoveGameButtonProps {
  label: string;
  disabled: boolean;
  onRemove: () => void;
}

export function RemoveGameButton({ label, disabled, onRemove }: RemoveGameButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="quiet" size="icon-sm" aria-label={label} disabled={disabled} onClick={onRemove}>
          <X />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{REMOVE_TOOLTIP}</TooltipContent>
    </Tooltip>
  );
}
