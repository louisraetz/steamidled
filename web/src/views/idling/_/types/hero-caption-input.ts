export interface HeroCaptionInput {
  sleeping: boolean;
  gameCount: number;
  nextIdleAt: number | null;
  counting: number;
  idlingSince: number | null;
  todayMs: number | null;
  now: number;
}
