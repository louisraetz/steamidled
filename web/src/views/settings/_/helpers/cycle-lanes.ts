import { LANE_SEEDS, MAX_CYCLES, WINDOW_HOURS } from '../constants/cycle-chart';
import type { CycleRanges, Lane, LaneSegment, SegmentKind } from '../types/cycle-chart';
import { mulberry32 } from './seeded-random';

function mean(min: number, max: number): number {
  return (min + max) / 2;
}

function within(min: number, max: number, unit: number): number {
  return min + (max - min) * unit;
}

export function collectingShare(ranges: CycleRanges): number {
  const idle = mean(ranges.idleMin, ranges.idleMax);
  return idle / (idle + mean(ranges.coolMin, ranges.coolMax));
}

function createLane() {
  const segments: LaneSegment[] = [];
  let time = 0;
  let gained = 0;
  const push = (kind: SegmentKind, duration: number, slope: number) => {
    if (time >= WINDOW_HOURS) return;
    const end = Math.min(WINDOW_HOURS, time + duration);
    const gainedEnd = gained + (end - time) * slope;
    segments.push({ kind, start: time, end, gainedStart: gained, gainedEnd });
    time = end;
    gained = gainedEnd;
  };
  return {
    collect: (duration: number, slope = 1) => push('collecting', duration, slope),
    rest: (duration: number) => push('cooldown', duration, 0),
    remaining: () => WINDOW_HOURS - time,
    finish: (): Lane => ({ segments, gained }),
  };
}

function cycleLane(seed: number, ranges: CycleRanges): Lane {
  const next = mulberry32(seed);
  const idle = () => within(ranges.idleMin, ranges.idleMax, next());
  const cool = () => within(ranges.coolMin, ranges.coolMax, next());
  const lane = createLane();
  const elapsed = next();
  lane.collect(idle() * elapsed);
  for (let cycle = 0; cycle < MAX_CYCLES && lane.remaining() > 0; cycle += 1) {
    lane.rest(cool());
    lane.collect(idle());
  }
  lane.collect(lane.remaining(), collectingShare(ranges));
  return lane.finish();
}

function nonstopLane(): Lane {
  const lane = createLane();
  lane.collect(WINDOW_HOURS);
  return lane.finish();
}

export function buildLanes(ranges: CycleRanges, enabled: boolean): Lane[] {
  return LANE_SEEDS.map((seed) => (enabled ? cycleLane(seed, ranges) : nonstopLane()));
}
