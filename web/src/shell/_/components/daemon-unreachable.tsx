import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { BarePage } from '@/components/bare-page';

export function DaemonUnreachable({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <BarePage>
      <main className="max-w-xl pt-12 sm:pt-24">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Can't reach steamidled</EmptyTitle>
            <EmptyDescription>
              The page loaded, but the daemon doesn't answer. Check that it runs with --web (systemctl status
              steamidled or docker compose ps).
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button pending={retrying} onClick={onRetry}>
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    </BarePage>
  );
}
