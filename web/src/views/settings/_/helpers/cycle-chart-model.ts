import type { CycleChartModel, CycleRanges } from '../types/cycle-chart';
import { cycleCaption } from './cycle-caption';
import { lanePaths } from './cycle-geometry';
import { buildLanes } from './cycle-lanes';

export function cycleChartModel(ranges: CycleRanges, enabled: boolean): CycleChartModel {
  const lanes = buildLanes(ranges, enabled);
  return { lanes: lanes.map(lanePaths), caption: cycleCaption(lanes, ranges, enabled) };
}
