import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCopy } from '@/hooks/use-copy';
import { COPY_ENTRY_ICONS, COPY_ENTRY_LIVE_TEXT } from '../constants/copy';

export function CopyEntryButton({ text }: { text: string }) {
  const { copied, copy } = useCopy();
  const state = copied ? 'done' : 'idle';
  const Icon = COPY_ENTRY_ICONS[state];
  const announcement = COPY_ENTRY_LIVE_TEXT[state];

  return (
    <span className="-my-1 opacity-0 group-hover/log:opacity-100 group-focus-within/log:opacity-100 pointer-coarse:opacity-100">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label="Copy entry" onClick={() => void copy(text)}>
            <Icon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy entry</TooltipContent>
      </Tooltip>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </span>
  );
}
