import { useDaemonState } from '@/hooks/use-daemon-state';
import { REPORT_HOUR_OPTIONS } from '../constants/notifications';
import { useSettingsMutation } from '../hooks/use-settings-mutation';
import { SettingSelect } from './setting-select';

export function ReportHourSelect({ disabled }: { disabled: boolean }) {
  const hour = useDaemonState((snapshot) => snapshot.settings.dailyReportHour) ?? 0;
  const mutation = useSettingsMutation();

  return (
    <SettingSelect
      id="daily-report-hour"
      label="Daily report at"
      description="Local time on the server running steamidled."
      value={String(hour)}
      options={REPORT_HOUR_OPTIONS}
      disabled={disabled}
      onValueChange={(value) => mutation.mutate({ dailyReportHour: Number(value) })}
    />
  );
}
