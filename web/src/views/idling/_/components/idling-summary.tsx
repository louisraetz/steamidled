import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useNow } from '@/hooks/use-now';
import type { GameDisplay } from '../types/game-display';
import { summaryMeta, summaryParts } from '../helpers/summary';
import { useIdlingActions } from '../hooks/use-idling-actions';
import { StopIdlingDialog } from './stop-idling-dialog';

export function IdlingSummary({ games }: { games: GameDisplay[] }) {
  const now = useNow();
  const idlingSince = useDaemonState((snapshot) => snapshot.idlingSince) ?? null;
  const active = useDaemonState((snapshot) => snapshot.phase === 'idling') ?? false;
  const canMutate = useCanMutate();
  const { stop } = useIdlingActions();
  const parts = summaryParts(games);

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold">
          {parts.map((part) => (
            <span key={part.label}>
              {part.separator}
              <span className="font-mono">{part.count}</span> {part.label}
            </span>
          ))}
        </h1>
        <p className="text-muted-foreground">{summaryMeta(idlingSince, games.length, now)}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/library">Edit selection</Link>
        </Button>
        <StopIdlingDialog
          gameCount={games.length}
          disabled={!canMutate || !active}
          pending={stop.isPending}
          onConfirm={() => stop.mutate()}
        />
      </div>
    </div>
  );
}
