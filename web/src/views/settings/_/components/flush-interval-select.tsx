import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import type { FlushIntervalHours } from '@/lib/settings';
import { FLUSH_OPTIONS } from '../constants/session';
import { useSettingsMutation } from '../hooks/use-settings-mutation';
import { SettingSelect } from './setting-select';

export function FlushIntervalSelect() {
  const hours = useDaemonState((snapshot) => snapshot.settings.flushIntervalHours) ?? 4;
  const canMutate = useCanMutate();
  const mutation = useSettingsMutation();

  return (
    <SettingSelect
      id="flush-interval"
      label="Commit playtime every"
      description="steamidled briefly reconnects so Steam saves the hours."
      value={String(hours)}
      options={FLUSH_OPTIONS}
      disabled={!canMutate}
      onValueChange={(value) => mutation.mutate({ flushIntervalHours: Number(value) as FlushIntervalHours })}
    />
  );
}
