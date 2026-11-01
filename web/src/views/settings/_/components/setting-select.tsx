import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SelectOption } from '../types/select-option';
import { SettingRow } from './setting-row';

interface SettingSelectProps {
  id: string;
  label: string;
  description: string;
  value: string;
  options: readonly SelectOption[];
  disabled: boolean;
  onValueChange: (value: string) => void;
}

export function SettingSelect({ id, label, description, value, options, disabled, onValueChange }: SettingSelectProps) {
  return (
    <SettingRow id={id} label={label} description={description} disabled={disabled}>
      <Select value={value} disabled={disabled} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingRow>
  );
}
