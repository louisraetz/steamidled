import { CHART_HEIGHT, CHART_WIDTH, PATH_PRECISION, WINDOW_HOURS } from '../constants/cycle-chart';
import type { Lane, LanePaths, LaneSegment, SegmentKind } from '../types/cycle-chart';

function round(value: number): number {
  return Math.round(value * PATH_PRECISION) / PATH_PRECISION;
}

function point(time: number, gained: number): string {
  const x = round((time / WINDOW_HOURS) * CHART_WIDTH);
  const y = round(CHART_HEIGHT - (gained / WINDOW_HOURS) * CHART_HEIGHT);
  return `${x} ${y}`;
}

function segmentPath(segment: LaneSegment): string {
  return `M${point(segment.start, segment.gainedStart)}L${point(segment.end, segment.gainedEnd)}`;
}

function pathOf(lane: Lane, kind: SegmentKind): string {
  return lane.segments
    .filter((segment) => segment.kind === kind)
    .map(segmentPath)
    .join('');
}

export function lanePaths(lane: Lane): LanePaths {
  return { collecting: pathOf(lane, 'collecting'), cooldown: pathOf(lane, 'cooldown') };
}
