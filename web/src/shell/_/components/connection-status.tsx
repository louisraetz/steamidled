import { cn } from '@/lib/utils';
import { RichText } from '@/components/rich-text';
import { toneClass } from '@/components/tone';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useNow } from '@/hooks/use-now';
import { describeConnection } from '../helpers/describe-connection';

export function ConnectionStatus() {
  const now = useNow();
  const display = useDaemonState((snapshot) => describeConnection(snapshot, now));
  if (!display) return null;
  const Icon = display.icon;

  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-base text-muted-foreground">
      <Icon className={cn('size-5 shrink-0', toneClass[display.tone])} />
      <span className="hidden truncate sm:inline">
        <RichText parts={display.label} />
      </span>
      <span className="truncate sm:hidden">
        <RichText parts={display.shortLabel} />
      </span>
    </span>
  );
}
