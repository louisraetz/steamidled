import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FILL_WHEN_ON, STROKE_WIDTH, TONE_WHEN_ON } from './_/constants/preference-toggle';

interface PreferenceToggleProps {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  filled?: boolean;
  tone: keyof typeof TONE_WHEN_ON;
  label: string;
  tooltip: string;
  pressed: boolean;
  disabled: boolean;
  tabIndex?: number;
  onToggle: () => void;
}

export function PreferenceToggle({
  icon: Icon,
  filled = false,
  tone,
  label,
  tooltip,
  pressed,
  disabled,
  tabIndex,
  onToggle,
}: PreferenceToggleProps) {
  return (
    <span data-on={pressed} className="group/pref inline-flex">
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            variant="quiet"
            size="sm"
            aria-label={label}
            pressed={pressed}
            disabled={disabled}
            tabIndex={tabIndex}
            onPressedChange={onToggle}
          >
            <Icon
              strokeWidth={STROKE_WIDTH[pressed ? 'on' : 'off']}
              className={cn(TONE_WHEN_ON[tone], filled && FILL_WHEN_ON)}
            />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </span>
  );
}
