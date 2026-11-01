import { NBSP } from '@/lib/constants';
import { customRanges, SCHEDULE_PROFILES, type ScheduleProfile, type ScheduleRanges } from '@/lib/settings';
import { mono, plain, type TextPart } from '@/lib/text-parts';
import type { DaemonSnapshot } from '@/lib/types';
import { CUSTOM_LABEL, CUSTOM_RANGES_NOT_SET, PROFILE_OPTIONS } from '../constants/profiles';
import type { ProfileTileModel } from '../types/profile-tile';
import { profileShare } from './cycle-caption';
import { cycleRangesOf } from './cycle-input';
import { longHourRange } from './hour-range';

function rangesOf(profile: ScheduleProfile, snapshot: DaemonSnapshot): ScheduleRanges | null {
  if (profile === 'custom') return customRanges(snapshot.settings.schedule);
  return SCHEDULE_PROFILES[profile].ranges;
}

function rangesParts(ranges: ScheduleRanges | null): TextPart[] {
  if (!ranges) return [plain(CUSTOM_RANGES_NOT_SET)];
  const idle = longHourRange(ranges.idleMinHours, ranges.idleMaxHours);
  const rest = longHourRange(ranges.cooldownMinHours, ranges.cooldownMaxHours);
  return [mono(`${idle}${NBSP}· rests${NBSP}${rest}`)];
}

function shareParts(ranges: ScheduleRanges | null): TextPart[] {
  if (!ranges) return [];
  return profileShare(cycleRangesOf(ranges));
}

export function profileTiles(snapshot: DaemonSnapshot): ProfileTileModel[] {
  return PROFILE_OPTIONS.map((option) => {
    const ranges = rangesOf(option.value, snapshot);
    return { ...option, ranges: rangesParts(ranges), share: shareParts(ranges) };
  });
}

export function profileLabel(profile: ScheduleProfile): string {
  if (profile === 'custom') return CUSTOM_LABEL;
  return SCHEDULE_PROFILES[profile].label;
}
