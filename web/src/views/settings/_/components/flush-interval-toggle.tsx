import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { FLUSH_LABEL, FLUSH_OPTIONS } from '../constants/session';
import { pickFlushInterval } from '../helpers/toggle-values';
import { useSettingsMutation } from '../hooks/use-settings-mutation';

export function FlushIntervalToggle() {
  const hours = useDaemonState((snapshot) => snapshot.settings.flushIntervalHours) ?? 4;
  const canMutate = useCanMutate();
  const mutation = useSettingsMutation();
  const select = (value: string) => {
    const next = pickFlushInterval(value);
    if (next) mutation.mutate({ flushIntervalHours: next });
  };

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label={FLUSH_LABEL}
      value={String(hours)}
      disabled={!canMutate}
      onValueChange={select}
    >
      {FLUSH_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          <span className="font-mono">{option.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
