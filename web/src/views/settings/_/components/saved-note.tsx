import { Check } from 'lucide-react';

function SavedText({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <>
      <Check className="size-4" />
      Saved
    </>
  );
}

export function SavedNote({ visible }: { visible: boolean }) {
  return (
    <span aria-live="polite" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <SavedText visible={visible} />
    </span>
  );
}
