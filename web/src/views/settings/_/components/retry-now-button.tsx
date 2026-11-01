import { Button } from '@/components/ui/button';

interface RetryNowButtonProps {
  visible: boolean;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}

export function RetryNowButton({ visible, disabled, pending, onClick }: RetryNowButtonProps) {
  if (!visible) return null;
  return (
    <Button variant="outline" disabled={disabled} pending={pending} onClick={onClick}>
      Retry now
    </Button>
  );
}
