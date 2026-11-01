import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UNIT_OPTIONS } from '../constants/menu';
import type { DurationUnit } from '../types/schedule-dialog';

export function DurationUnitSelect({ value, onChange }: { value: DurationUnit; onChange: (unit: DurationUnit) => void }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as DurationUnit)}>
      <SelectTrigger aria-label="Unit" className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {UNIT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
