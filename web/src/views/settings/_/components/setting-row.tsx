import type { ReactNode } from 'react';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { SettingDescription } from './setting-description';

interface SettingRowProps {
  id: string;
  label: string;
  description?: string;
  hint?: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}

export function SettingRow({ id, label, description, hint, disabled = false, children }: SettingRowProps) {
  return (
    <Field orientation="horizontal" data-disabled={disabled}>
      <FieldContent>
        <div className="flex items-center gap-1.5">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {hint}
        </div>
        <SettingDescription text={description} />
      </FieldContent>
      {children}
    </Field>
  );
}
