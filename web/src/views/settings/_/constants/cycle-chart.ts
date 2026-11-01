import { HOURS_PER_DAY } from '@/lib/constants';

export const WINDOW_HOURS = 2160;
export const WINDOW_DAYS = WINDOW_HOURS / HOURS_PER_DAY;
export const LANE_SEEDS = [11, 23, 37, 51, 73];
export const MAX_CYCLES = 360;

export const CHART_WIDTH = 900;
export const CHART_HEIGHT = 200;
export const CHART_VIEW_BOX = `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`;
export const PATH_PRECISION = 100;

export const SHARE_STEP = 5;
export const YIELD_STEP_HOURS = 10;

export const MULBERRY_STEP = 1831565813;
export const UINT32_RANGE = 4294967296;

export const CHART_AXIS = { start: 'Today', end: `${WINDOW_DAYS} days` };
export const CHART_SAMPLE_LABEL = `${LANE_SEEDS.length} example games`;
