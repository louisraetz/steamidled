import type { ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';
import { SettingRow } from './setting-row';

interface SettingSwitchProps {
  id: string;
  label: string;
  description?: string;
  hint?: ReactNode;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SettingSwitch({ id, label, description, hint, checked, disabled, onCheckedChange }: SettingSwitchProps) {
  return (
    <SettingRow id={id} label={label} description={description} hint={hint} disabled={disabled}>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </SettingRow>
  );
}
