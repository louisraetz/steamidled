import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROW_ACTION_CLASS } from '../constants/picker';

export function PickerRowAction({ added, disabled }: { added: boolean; disabled: boolean }) {
  if (!added) {
    return (
      <Button asChild variant="outline" size="sm-static" className={ROW_ACTION_CLASS}>
        <span aria-hidden="true">
          <Plus />
          Add
        </span>
      </Button>
    );
  }
  if (disabled) {
    return (
      <Button asChild variant="secondary" size="sm-static" className={ROW_ACTION_CLASS}>
        <span aria-hidden="true">
          <Check />
          Added
        </span>
      </Button>
    );
  }
  return (
    <Button asChild variant="secondary" size="sm-static" className={ROW_ACTION_CLASS}>
      <span aria-hidden="true">
        <span className="inline-flex items-center gap-1.5 sm:group-hover/row:hidden sm:group-focus-visible/row:hidden">
          <Check />
          Added
        </span>
        <span className="hidden items-center gap-1.5 sm:group-hover/row:inline-flex sm:group-focus-visible/row:inline-flex">
          <X />
          Remove
        </span>
      </span>
    </Button>
  );
}
