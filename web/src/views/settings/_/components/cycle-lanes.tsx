import { CHART_HEIGHT, CHART_VIEW_BOX, CHART_WIDTH } from '../constants/cycle-chart';
import type { LanePaths } from '../types/cycle-chart';

export function CycleLanes({ lanes }: { lanes: LanePaths[] }) {
  return (
    <svg
      viewBox={CHART_VIEW_BOX}
      preserveAspectRatio="none"
      aria-hidden="true"
      fill="none"
      strokeLinecap="round"
      className="h-32 w-full overflow-visible lg:h-40"
    >
      <line
        x1={0}
        y1={CHART_HEIGHT}
        x2={CHART_WIDTH}
        y2={CHART_HEIGHT}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        className="stroke-border"
      />
      {lanes.map((lane, index) => (
        <g key={index} strokeWidth={2}>
          <path d={lane.cooldown} vectorEffect="non-scaling-stroke" className="stroke-cooldown" />
          <path d={lane.collecting} vectorEffect="non-scaling-stroke" className="stroke-primary" />
        </g>
      ))}
    </svg>
  );
}
