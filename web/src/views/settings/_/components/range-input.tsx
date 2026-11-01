import type { UseFormRegisterReturn } from 'react-hook-form';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

interface RangeInputProps {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  invalid: boolean;
  registration: UseFormRegisterReturn;
}

export function RangeInput({ id, label, unit, min, max, invalid, registration }: RangeInputProps) {
  return (
    <InputGroup className="w-32">
      <InputGroupInput
        {...registration}
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={1}
        aria-label={label}
        aria-invalid={invalid}
        className="font-mono"
      />
      <InputGroupAddon align="inline-end">{unit}</InputGroupAddon>
    </InputGroup>
  );
}
