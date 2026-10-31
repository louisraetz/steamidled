import { Button } from '@/components/ui/button';

interface TelegramCheckAgainProps {
  visible: boolean;
  checking: boolean;
  onClick: () => void;
}

export function TelegramCheckAgain({ visible, checking, onClick }: TelegramCheckAgainProps) {
  if (!visible) return null;
  return (
    <Button variant="outline" pending={checking} onClick={onClick}>
      Check again
    </Button>
  );
}
