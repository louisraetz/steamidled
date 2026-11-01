import { FieldDescription } from '@/components/ui/field';

export function SettingDescription({ text }: { text?: string }) {
  if (!text) return null;
  return <FieldDescription>{text}</FieldDescription>;
}
