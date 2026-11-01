import type { ScheduleProfile } from '@/lib/settings';
import type { TextPart } from '@/lib/text-parts';

export interface ProfileTileModel {
  value: ScheduleProfile;
  label: string;
  sentence: string;
  ranges: TextPart[];
  share: TextPart[];
}
