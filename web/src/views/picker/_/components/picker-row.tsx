import { memo } from 'react';
import { Infinity as InfinityIcon, Star } from 'lucide-react';
import { PreferenceToggle } from '@/components/preference-toggle';
import { GameArt } from '@/components/game-art';
import { AUTO_START_TOOLTIP } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { FamilyBadge } from './family-badge';
import { PickerRowAction } from './picker-row-action';
import { PreferenceMark } from './preference-mark';

interface PickerRowProps {
  index: number;
  appid: number;
  name: string;
  total: string;
  totalTitle: string | undefined;
  totalClassName: string;
  family: boolean;
  added: boolean;
  favorite: boolean;
  exempt: boolean;
  disabled: boolean;
  favoriteLocked: boolean;
  focusable: boolean;
  onToggle: (appid: number) => void;
  onToggleFavorite: (appid: number) => void;
  onFocusRow: (index: number) => void;
}

export const PickerRow = memo(function PickerRow(props: PickerRowProps) {
  return (
    <div
      role="listitem"
      className="content-auto flex items-center gap-1 border-b pr-2 hover:bg-surface has-aria-disabled:hover:bg-transparent"
    >
      <button
        type="button"
        data-row-index={props.index}
        tabIndex={props.focusable ? 0 : -1}
        aria-pressed={props.added}
        aria-disabled={props.disabled}
        aria-keyshortcuts="Enter Space F X"
        onClick={() => props.onToggle(props.appid)}
        onFocus={() => props.onFocusRow(props.index)}
        className="group/row flex h-12 min-w-0 flex-1 items-center gap-3 px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-disabled:cursor-default"
      >
        <GameArt appid={props.appid} name={props.name} size="responsive" />
        <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
          <span className="flex min-w-0 items-center gap-1.5 sm:flex-1">
            <span className="truncate" title={props.name}>
              {props.name}
            </span>
            <PreferenceMark visible={props.exempt} icon={InfinityIcon} label="No cooldown" className="text-success" />
          </span>
          <span className="flex items-center gap-2 text-sm sm:contents sm:text-base">
            <FamilyBadge visible={props.family} />
            <span className={cn('shrink-0 sm:w-16 sm:text-right', props.totalClassName)} title={props.totalTitle}>
              {props.total}
            </span>
          </span>
        </span>
        <PickerRowAction added={props.added} disabled={props.disabled} />
      </button>
      <PreferenceToggle
        icon={Star}
        filled
        tone="foreground"
        label={`Auto-start ${props.name}`}
        tooltip={AUTO_START_TOOLTIP}
        pressed={props.favorite}
        disabled={props.favoriteLocked}
        tabIndex={props.focusable ? 0 : -1}
        onToggle={() => props.onToggleFavorite(props.appid)}
      />
    </div>
  );
});
