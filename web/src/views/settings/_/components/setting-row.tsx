import type { ReactNode } from 'react';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { SettingDescription } from './setting-description';

interface SettingRowProps {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  children: ReactNode;
}

export function SettingRow({ id, label, description, disabled = false, children }: SettingRowProps) {
  return (
    <Field orientation="horizontal" data-disabled={disabled}>
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <SettingDescription text={description} />
      </FieldContent>
      {children}
    </Field>
  );
}
