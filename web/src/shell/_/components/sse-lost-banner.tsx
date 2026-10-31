import { Alert, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { useConnectionStore } from '@/stores/connection-store';

export function SseLostBanner() {
  const lost = useConnectionStore((state) => state.status === 'reconnecting');
  if (!lost) return null;

  return (
    <div className="mx-auto w-full max-w-6xl shrink-0 px-4 pt-4 sm:px-6 lg:px-8">
      <Alert>
        <Spinner />
        <AlertTitle>Lost connection to steamidled. Retrying…</AlertTitle>
      </Alert>
    </div>
  );
}
