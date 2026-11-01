import type { TextPart } from '@/lib/text-parts';

export interface CycleRanges {
  idleMin: number;
  idleMax: number;
  coolMin: number;
  coolMax: number;
}

export type SegmentKind = 'collecting' | 'cooldown';

export interface LaneSegment {
  kind: SegmentKind;
  start: number;
  end: number;
  gainedStart: number;
  gainedEnd: number;
}

export interface Lane {
  segments: LaneSegment[];
  gained: number;
}

export type LanePaths = Record<SegmentKind, string>;

export interface CycleChartModel {
  lanes: LanePaths[];
  caption: TextPart[];
}
