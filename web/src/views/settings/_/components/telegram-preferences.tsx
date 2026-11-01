import { Button } from '@/components/ui/button';
import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { ALWAYS_SENT_NOTE, NOTIFY_OPTIONS } from '../constants/notifications';
import { useTelegramPreferences } from '../hooks/use-telegram-preferences';
import { ReportHourSelect } from './report-hour-select';
import { SettingSwitch } from './setting-switch';

export function TelegramPreferences({ disabled }: { disabled: boolean }) {
  const prefs = useDaemonState((snapshot) => snapshot.telegram.notify);
  const { notify, test, report } = useTelegramPreferences();

  return (
    <>
      <FieldSet className="gap-4">
        <FieldLegend variant="label">Notify me about</FieldLegend>
        <FieldDescription>{ALWAYS_SENT_NOTE}</FieldDescription>
        {NOTIFY_OPTIONS.map((option) => (
          <SettingSwitch
            key={option.key}
            id={`notify-${option.key}`}
            label={option.label}
            checked={prefs?.[option.key] ?? true}
            disabled={disabled}
            onCheckedChange={(checked) => notify.mutate({ [option.key]: checked })}
          />
        ))}
      </FieldSet>
      <ReportHourSelect disabled={disabled} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={disabled} pending={test.isPending} onClick={() => test.mutate()}>
          Send test message
        </Button>
        <Button variant="outline" disabled={disabled} pending={report.isPending} onClick={() => report.mutate()}>
          Send report now
        </Button>
      </div>
    </>
  );
}
