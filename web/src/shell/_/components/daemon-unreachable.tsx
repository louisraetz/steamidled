import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { BarePage } from '@/components/bare-page';
import { IdleMascot } from '@/components/idle-mascot';

export function DaemonUnreachable({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <BarePage>
      <main className="flex max-w-sm flex-col pt-12 pb-12 sm:pt-24">
        <Empty className="py-0">
          <EmptyMedia>
            <IdleMascot variant="unplugged" className="size-24" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Can't reach steamidled</EmptyTitle>
            <EmptyDescription>
              The page loaded, but the daemon doesn't answer. Check that it runs with --web (systemctl status
              steamidled or docker compose ps).
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" pending={retrying} onClick={onRetry}>
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    </BarePage>
  );
}
