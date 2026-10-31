import { Kbd } from '@/components/ui/kbd';
import { MAX_IDLE_GAMES } from '@/lib/constants';
import { selectionSuffix } from '../helpers/selection-summary';
import type { SelectionActionsKind } from '../types/selection-actions-kind';
import { SelectionActions } from './selection-actions';

interface SelectionBarProps {
  selectedCount: number;
  changes: number;
  favoritesAvailable: boolean;
  actionsKind: SelectionActionsKind;
  pending: boolean;
  disabled: boolean;
  onApply: () => void;
  onDiscard: () => void;
  onSelectFavorites: () => void;
}

export function SelectionBar(props: SelectionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-auto border-t bg-background px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2.5">
        <p aria-live="polite">
          <span className="font-mono">
            {props.selectedCount} / {MAX_IDLE_GAMES}
          </span>{' '}
          selected
          <span className="text-muted-foreground">{selectionSuffix(props.selectedCount, props.changes)}</span>
        </p>
        <p className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
          <Kbd>Space</Kbd> select · <Kbd>F</Kbd> favorite · <Kbd>X</Kbd> exempt
        </p>
        <SelectionActions
          kind={props.actionsKind}
          selectedCount={props.selectedCount}
          favoritesAvailable={props.favoritesAvailable}
          pending={props.pending}
          disabled={props.disabled}
          onApply={props.onApply}
          onDiscard={props.onDiscard}
          onSelectFavorites={props.onSelectFavorites}
        />
      </div>
    </div>
  );
}
