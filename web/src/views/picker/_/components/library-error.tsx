import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function LibraryError({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>Couldn't load your library</AlertTitle>
      <AlertDescription>
        <p>Steam didn't answer in time. This usually clears up within a minute.</p>
        <Button variant="outline" size="sm" pending={retrying} onClick={onRetry}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
