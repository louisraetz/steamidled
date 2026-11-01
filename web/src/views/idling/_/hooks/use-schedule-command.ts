import { toast } from 'sonner';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';
import { SCHEDULE_COMMANDS } from '../constants/schedule-commands';
import { focusMenuTrigger } from '../helpers/focus-menu-trigger';
import type { ScheduleCommandInput, ScheduleCommandKey } from '../types/schedule-command';

export function useScheduleCommand(key: ScheduleCommandKey, silent = false) {
  const command = SCHEDULE_COMMANDS[key];
  return useSnapshotMutation((input: ScheduleCommandInput) => command.run(input), {
    errorPrefix: command.errorPrefix,
    silent,
    onSuccess: (_snapshot, input) => {
      toast.success(command.success(input));
      focusMenuTrigger(input.appid);
    },
  });
}
