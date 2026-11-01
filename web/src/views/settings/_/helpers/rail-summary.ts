import { mono, plain, type TextPart } from '@/lib/text-parts';
import type { DaemonSnapshot } from '@/lib/types';
import { RAIL_RANGE_SEPARATOR, RAIL_SEPARATOR, SCHEDULE_OFF_SUMMARY, TELEGRAM_SUMMARY } from '../constants/rail';
import type { SettingsSectionKey } from '../types/settings-section';
import { shortHourRange } from './hour-range';
import { profileLabel } from './profile-tiles';
import { personaLabel } from './toggle-values';

function scheduleSummary(snapshot: DaemonSnapshot): TextPart[] {
  const { enabled, profile } = snapshot.settings.schedule;
  if (!enabled) return [plain(SCHEDULE_OFF_SUMMARY)];
  const ranges = snapshot.effectiveSchedule;
  return [
    plain(`${profileLabel(profile)}${RAIL_SEPARATOR}`),
    mono(shortHourRange(ranges.idleMinHours, ranges.idleMaxHours)),
    plain(RAIL_RANGE_SEPARATOR),
    mono(shortHourRange(ranges.cooldownMinHours, ranges.cooldownMaxHours)),
  ];
}

function steamSummary(snapshot: DaemonSnapshot): TextPart[] {
  return [
    plain(`${personaLabel(snapshot.settings.personaState)}${RAIL_SEPARATOR}every `),
    mono(`${snapshot.settings.flushIntervalHours}h`),
  ];
}

function telegramSummary(snapshot: DaemonSnapshot): TextPart[] {
  const { state, notify } = snapshot.telegram;
  if (state === 'awaiting-start') return [plain(TELEGRAM_SUMMARY.waiting)];
  if (state !== 'connected') return [plain(TELEGRAM_SUMMARY.off)];
  const prefs = Object.values(notify);
  return [
    plain(`${TELEGRAM_SUMMARY.on}${RAIL_SEPARATOR}`),
    mono(String(prefs.filter(Boolean).length)),
    plain(' of '),
    mono(String(prefs.length)),
  ];
}

function accountSummary(snapshot: DaemonSnapshot): TextPart[] {
  return [plain(snapshot.accountName ?? '')];
}

const SUMMARIES: Record<SettingsSectionKey, (snapshot: DaemonSnapshot) => TextPart[]> = {
  schedule: scheduleSummary,
  steam: steamSummary,
  telegram: telegramSummary,
  account: accountSummary,
};

export function railSummary(section: SettingsSectionKey, snapshot: DaemonSnapshot): TextPart[] {
  return SUMMARIES[section](snapshot);
}
