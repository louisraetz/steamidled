import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FILL_WHEN_ON, STROKE_WIDTH } from '../constants/preferences';

interface PreferenceToggleProps {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  filled?: boolean;
  label: string;
  shortcut: string;
  pressed: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function PreferenceToggle({ icon: Icon, filled = false, label, shortcut, pressed, disabled, onToggle }: PreferenceToggleProps) {
  const strokeWidth = STROKE_WIDTH[pressed ? 'on' : 'off'];
  return (
    <span
      data-on={pressed}
      className="group/pref opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 data-[on=true]:opacity-100 pointer-coarse:opacity-100"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            tabIndex={-1}
            aria-label={label}
            aria-keyshortcuts={shortcut}
            pressed={pressed}
            disabled={disabled}
            onPressedChange={onToggle}
          >
            <Icon
              strokeWidth={strokeWidth}
              className={cn('size-4 group-data-[on=false]/pref:text-tertiary', filled && FILL_WHEN_ON)}
            />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          {label} ({shortcut})
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
