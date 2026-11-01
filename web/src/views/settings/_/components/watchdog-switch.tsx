import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useSettingsMutation } from '../hooks/use-settings-mutation';
import { SettingSwitch } from './setting-switch';

export function WatchdogSwitch() {
  const watchdog = useDaemonState((snapshot) => snapshot.settings.watchdog) ?? true;
  const canMutate = useCanMutate();
  const mutation = useSettingsMutation();

  return (
    <SettingSwitch
      id="watchdog"
      label="Watchdog"
      description="Reconnects when Steam stops counting playtime."
      checked={watchdog}
      disabled={!canMutate}
      onCheckedChange={(checked) => mutation.mutate({ watchdog: checked })}
    />
  );
}
