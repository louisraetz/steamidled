import { CHART_AXIS } from '../constants/cycle-chart';

export function CycleAxis() {
  return (
    <div aria-hidden="true" className="flex justify-between text-sm text-tertiary">
      <span>{CHART_AXIS.start}</span>
      <span>{CHART_AXIS.end}</span>
    </div>
  );
}
