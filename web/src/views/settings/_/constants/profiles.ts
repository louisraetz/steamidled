import { SCHEDULE_PROFILES, type ScheduleProfile } from '@/lib/settings';

export const PROFILE_PICKER_LABEL = 'Schedule profile';
export const CUSTOM_LABEL = 'Custom';
export const CUSTOM_RANGES_NOT_SET = 'Not set';

export const PROFILE_OPTIONS: readonly { value: ScheduleProfile; label: string; sentence: string }[] = [
  {
    value: 'weekend',
    label: SCHEDULE_PROFILES.weekend.label,
    sentence: 'Plays a day or three, then rests most of the week.',
  },
  { value: 'daily', label: SCHEDULE_PROFILES.daily.label, sentence: 'Plays most days with short breaks.' },
  { value: 'grinder', label: SCHEDULE_PROFILES.grinder.label, sentence: 'Nearly nonstop with short breaks.' },
  { value: 'custom', label: CUSTOM_LABEL, sentence: 'Your own ranges.' },
];
