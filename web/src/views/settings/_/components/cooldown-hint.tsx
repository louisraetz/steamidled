import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { RichText } from '@/components/rich-text';
import { COOLDOWN_HINT } from '../constants/schedule';
import { cooldownHintBody } from '../helpers/cooldown-hint';
import { useHoverPopover } from '../hooks/use-hover-popover';

export function CooldownHint() {
  const hint = useHoverPopover();
  return (
    <Popover open={hint.open} onOpenChange={hint.onOpenChange}>
      <PopoverTrigger asChild {...hint.triggerProps}>
        <Button variant="quiet" size="icon-xs" aria-label={COOLDOWN_HINT.title}>
          <Info className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        collisionPadding={16}
        className="w-xs"
        onOpenAutoFocus={hint.keepFocus}
        onCloseAutoFocus={hint.keepFocus}
      >
        <div className="flex flex-col gap-2 text-sm">
          <PopoverHeader>
            <PopoverTitle>{COOLDOWN_HINT.title}</PopoverTitle>
            <PopoverDescription>
              <RichText parts={cooldownHintBody()} />
            </PopoverDescription>
          </PopoverHeader>
          <p className="text-tertiary">{COOLDOWN_HINT.footnote}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
