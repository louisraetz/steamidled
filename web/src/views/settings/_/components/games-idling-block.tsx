import { RichText } from '@/components/rich-text';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { idlingNowParts } from '../helpers/session';
import { ScheduleActions } from './schedule-actions';
import { SettingsBlock } from './settings-block';

export function GamesIdlingBlock() {
  const line = useDaemonState(idlingNowParts) ?? [];
  return (
    <SettingsBlock title="Games idling now" description={<RichText parts={line} />}>
      <ScheduleActions />
    </SettingsBlock>
  );
}
