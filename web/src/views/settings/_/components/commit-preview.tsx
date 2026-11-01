import { RichText } from '@/components/rich-text';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { DAY_BAR_LABELS } from '../constants/commit';
import { commitSegments, commitSentence } from '../helpers/commit-preview';

export function CommitPreview() {
  const hours = useDaemonState((snapshot) => snapshot.settings.flushIntervalHours) ?? 4;
  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden="true" className="flex flex-col gap-1">
        <div className="flex h-3 gap-1">
          {commitSegments(hours).map((segment) => (
            <span key={segment} className="flex-1 rounded-xs bg-input" />
          ))}
        </div>
        <div className="flex justify-between font-mono text-sm text-tertiary">
          <span>{DAY_BAR_LABELS.start}</span>
          <span>{DAY_BAR_LABELS.end}</span>
        </div>
      </div>
      <p>
        <RichText parts={commitSentence(hours)} />
      </p>
    </div>
  );
}
