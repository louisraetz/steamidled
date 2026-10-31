import { Button } from '@/components/ui/button';

export function CodeInsteadButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  if (!visible) return null;
  return (
    <div className="-ml-3">
      <Button variant="ghost" size="sm" onClick={onClick}>
        Enter a code instead
      </Button>
    </div>
  );
}
