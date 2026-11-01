import { ScheduleActions } from './schedule-actions';
import { ScheduleRanges } from './schedule-ranges';
import { ScheduleSwitch } from './schedule-switch';
import { SettingsSection } from './settings-section';

export function ScheduleSection() {
  return (
    <SettingsSection title="Idle schedule" description="How long games collect before a break, and how long the break lasts.">
      <ScheduleSwitch />
      <ScheduleRanges />
      <ScheduleActions />
    </SettingsSection>
  );
}
