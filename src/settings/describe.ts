import { formatHourOfDay } from '../utils/format.js';
import type { Settings } from './schema.js';

export function describeSettingsChange(previous: Settings, next: Settings): string[] {
  const changes: string[] = [];
  const before = previous.schedule;
  const after = next.schedule;
  if (before.enabled !== after.enabled) changes.push(after.enabled ? 'random cooldowns on' : 'random cooldowns off');
  if (before.idleMinHours !== after.idleMinHours || before.idleMaxHours !== after.idleMaxHours) {
    changes.push(`idle phase ${after.idleMinHours}–${after.idleMaxHours}h`);
  }
  if (before.cooldownMinHours !== after.cooldownMinHours || before.cooldownMaxHours !== after.cooldownMaxHours) {
    changes.push(`cooldown ${after.cooldownMinHours}–${after.cooldownMaxHours}h`);
  }
  if (previous.flushIntervalHours !== next.flushIntervalHours) changes.push(`commit every ${next.flushIntervalHours}h`);
  if (previous.watchdog !== next.watchdog) changes.push(next.watchdog ? 'watchdog on' : 'watchdog off');
  if (previous.personaState !== next.personaState) changes.push(`Steam status ${next.personaState}`);
  if (previous.dailyReportHour !== next.dailyReportHour) changes.push(`daily report at ${formatHourOfDay(next.dailyReportHour)}`);
  return changes;
}
