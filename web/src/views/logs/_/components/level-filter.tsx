import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatCount } from '@/lib/format';
import type { LogLevel } from '@/lib/types';
import { LEVELS } from '../constants/levels';

interface LevelFilterProps {
  value: LogLevel[];
  counts: Record<LogLevel, number>;
  onChange: (levels: LogLevel[]) => void;
}

export function LevelFilter({ value, counts, onChange }: LevelFilterProps) {
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      size="sm"
      aria-label="Filter by level"
      value={value}
      onValueChange={(levels) => onChange(levels as LogLevel[])}
    >
      {LEVELS.map((level) => (
        <ToggleGroupItem key={level.value} value={level.value} className="gap-1.5">
          {level.label}
          <span className="font-mono text-muted-foreground">{formatCount(counts[level.value])}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
