import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { useScheduleForm } from '../hooks/use-schedule-form';
import { useScheduleProfile } from '../hooks/use-schedule-profile';
import { CycleChart } from './cycle-chart';
import { GamesIdlingBlock } from './games-idling-block';
import { ProfilePicker } from './profile-picker';
import { ScheduleRanges } from './schedule-ranges';
import { ScheduleSentence } from './schedule-sentence';
import { ScheduleSwitch } from './schedule-switch';
import { SettingsPanel } from './settings-panel';

export function SchedulePanel() {
  const enabled = useDaemonState((snapshot) => snapshot.settings.schedule.enabled) ?? true;
  const canMutate = useCanMutate();
  const schedule = useScheduleForm();
  const profile = useScheduleProfile(enabled);

  return (
    <SettingsPanel title="Schedule" description="When games collect and when they rest.">
      <div className="flex flex-col gap-8">
        <ScheduleSwitch />
        <ProfilePicker profile={profile} enabled={enabled} />
        <div className="flex flex-col gap-4">
          <ScheduleSentence form={schedule.form} enabled={enabled} custom={profile.custom} />
          <CycleChart form={schedule.form} enabled={enabled} custom={profile.custom} />
        </div>
        <ScheduleRanges schedule={schedule} disabled={!enabled || !canMutate} visible={profile.custom} />
      </div>
      <GamesIdlingBlock />
    </SettingsPanel>
  );
}
