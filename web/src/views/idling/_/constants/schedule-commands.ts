import { api } from '@/lib/api';
import { formatHoursLabel } from '../helpers/duration';
import type { ScheduleCommand, ScheduleCommandKey } from '../types/schedule-command';

export const SCHEDULE_COMMANDS: Record<ScheduleCommandKey, ScheduleCommand> = {
  'cooldown-now': {
    run: ({ appid, hours }) => api.coolDownNow(appid, hours),
    errorPrefix: "Couldn't start the cooldown.",
    success: ({ name, hours }) =>
      hours === null ? `${name} is cooling down.` : `${name} is cooling down for ${formatHoursLabel(hours)}.`,
  },
  'end-cooldown': {
    run: ({ appid }) => api.endCooldownNow(appid),
    errorPrefix: "Couldn't end the cooldown.",
    success: ({ name }) => `${name} is collecting again.`,
  },
  'next-cooldown': {
    run: ({ appid, hours }) => api.setNextCooldownIn(appid, hours ?? 1),
    errorPrefix: "Couldn't change the next cooldown.",
    success: ({ name, hours }) => `${name} cools down after ${formatHoursLabel(hours ?? 1)} more idling.`,
  },
  'cooldown-remaining': {
    run: ({ appid, hours }) => api.setCooldownRemaining(appid, hours ?? 1),
    errorPrefix: "Couldn't change the cooldown.",
    success: ({ name, hours }) => `${name} collects again in ${formatHoursLabel(hours ?? 1)}.`,
  },
};
