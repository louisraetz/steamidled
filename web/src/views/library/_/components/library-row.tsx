import { memo } from 'react';
import { Infinity as InfinityIcon, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { FamilyBadge } from './family-badge';
import { PreferenceToggle } from './preference-toggle';

interface LibraryRowProps {
  index: number;
  appid: number;
  name: string;
  total: string;
  totalTitle: string | undefined;
  totalClassName: string;
  family: boolean;
  selected: boolean;
  favorite: boolean;
  exempt: boolean;
  selectDisabled: boolean;
  locked: boolean;
  focusable: boolean;
  onToggleSelect: (appid: number) => void;
  onToggleFavorite: (appid: number) => void;
  onToggleExempt: (appid: number) => void;
  onFocusRow: (index: number) => void;
}

export const LibraryRow = memo(function LibraryRow(props: LibraryRowProps) {
  const checkboxId = `game-${props.appid}`;
  return (
    <div
      role="listitem"
      data-row-index={props.index}
      tabIndex={props.focusable ? 0 : -1}
      aria-keyshortcuts="Space F X"
      onFocus={() => props.onFocusRow(props.index)}
      className="group/row flex h-9 items-center gap-3 border-b outline-none content-auto hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset pointer-coarse:h-11"
    >
      <Checkbox
        id={checkboxId}
        tabIndex={-1}
        checked={props.selected}
        disabled={props.selectDisabled || props.locked}
        onCheckedChange={() => props.onToggleSelect(props.appid)}
      />
      <label htmlFor={checkboxId} className="min-w-0 flex-1 truncate" title={props.name}>
        {props.name}
      </label>
      <FamilyBadge visible={props.family} />
      <span className={cn('min-w-14 shrink-0 text-right sm:w-24', props.totalClassName)} title={props.totalTitle}>
        {props.total}
      </span>
      <div className="flex shrink-0 items-center">
        <PreferenceToggle
          icon={Star}
          filled
          label="Favorite"
          shortcut="F"
          pressed={props.favorite}
          disabled={props.locked}
          onToggle={() => props.onToggleFavorite(props.appid)}
        />
        <PreferenceToggle
          icon={InfinityIcon}
          label="Exempt from cooldown"
          shortcut="X"
          pressed={props.exempt}
          disabled={props.locked}
          onToggle={() => props.onToggleExempt(props.appid)}
        />
      </div>
    </div>
  );
});
