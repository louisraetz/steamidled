import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useSettingsMutation } from '../hooks/use-settings-mutation';
import { CooldownHint } from './cooldown-hint';
import { SettingSwitch } from './setting-switch';

export function ScheduleSwitch() {
  const enabled = useDaemonState((snapshot) => snapshot.settings.schedule.enabled) ?? true;
  const canMutate = useCanMutate();
  const mutation = useSettingsMutation();

  return (
    <SettingSwitch
      id="schedule-enabled"
      label="Random cooldowns"
      description="Games take breaks so their hours look natural. Turn off to idle nonstop."
      hint={<CooldownHint />}
      checked={enabled}
      disabled={!canMutate}
      onCheckedChange={(checked) => mutation.mutate({ schedule: { enabled: checked } })}
    />
  );
}
