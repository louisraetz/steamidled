import { formatHourOfDay } from '../utils/format.js';
import { customRanges, type ScheduleRangeField, type ScheduleRanges, type Settings } from './schema.js';

function rangeChange(
  before: ScheduleRanges | null,
  after: ScheduleRanges | null,
  [minField, maxField]: readonly [ScheduleRangeField, ScheduleRangeField],
  label: string
): string[] {
  if (!after) return [];
  if (before?.[minField] === after[minField] && before?.[maxField] === after[maxField]) return [];
  return [`${label} ${after[minField]}–${after[maxField]}h`];
}

export function describeSettingsChange(previous: Settings, next: Settings): string[] {
  const changes: string[] = [];
  const before = previous.schedule;
  const after = next.schedule;
  const beforeRanges = customRanges(before);
  const afterRanges = customRanges(after);
  if (before.enabled !== after.enabled) changes.push(after.enabled ? 'random cooldowns on' : 'random cooldowns off');
  if (before.profile !== after.profile && after.profile === 'custom') changes.push('custom schedule');
  changes.push(...rangeChange(beforeRanges, afterRanges, ['idleMinHours', 'idleMaxHours'], 'idle phase'));
  changes.push(...rangeChange(beforeRanges, afterRanges, ['cooldownMinHours', 'cooldownMaxHours'], 'cooldown'));
  if (previous.flushIntervalHours !== next.flushIntervalHours) changes.push(`commit every ${next.flushIntervalHours}h`);
  if (previous.watchdog !== next.watchdog) changes.push(next.watchdog ? 'watchdog on' : 'watchdog off');
  if (previous.personaState !== next.personaState) changes.push(`Steam status ${next.personaState}`);
  if (previous.dailyReportHour !== next.dailyReportHour) changes.push(`daily report at ${formatHourOfDay(next.dailyReportHour)}`);
  return changes;
}
