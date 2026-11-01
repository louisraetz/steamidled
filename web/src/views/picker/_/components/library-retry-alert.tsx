import { RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RichText } from '@/components/rich-text';
import { useNow } from '@/hooks/use-now';
import { LIBRARY_RETRY_TITLE, libraryRetryBody } from '@/lib/library-retry';

export function LibraryRetryAlert({ nextRetryAt }: { nextRetryAt: number }) {
  const now = useNow();
  return (
    <Alert>
      <RefreshCw />
      <AlertTitle>{LIBRARY_RETRY_TITLE}</AlertTitle>
      <AlertDescription>
        <p>
          <RichText parts={libraryRetryBody(nextRetryAt, now)} />
        </p>
      </AlertDescription>
    </Alert>
  );
}
