import { Button } from '@/components/ui/button';
import type { SelectionActionsKind } from '../types/selection-actions-kind';

interface SelectionActionsProps {
  kind: SelectionActionsKind;
  selectedCount: number;
  favoritesAvailable: boolean;
  pending: boolean;
  disabled: boolean;
  onApply: () => void;
  onDiscard: () => void;
  onSelectFavorites: () => void;
}

export function SelectionActions(props: SelectionActionsProps) {
  if (props.kind === 'none') return null;
  if (props.kind === 'blocked') {
    return <p className="text-muted-foreground">Apply is available once Steam is connected.</p>;
  }
  if (props.kind === 'apply') {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" disabled={props.pending} onClick={props.onDiscard}>
          Discard
        </Button>
        <Button disabled={props.disabled} pending={props.pending} onClick={props.onApply}>
          Apply changes
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" disabled={props.disabled || props.pending || !props.favoritesAvailable}
        onClick={props.onSelectFavorites}>
        Select favorites
      </Button>
      <Button disabled={props.disabled || props.selectedCount === 0} pending={props.pending} onClick={props.onApply}>
        Start idling
      </Button>
    </div>
  );
}
