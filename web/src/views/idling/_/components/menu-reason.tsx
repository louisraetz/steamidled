import { DropdownMenuLabel } from '@/components/ui/dropdown-menu';

export function MenuReason({ text }: { text: string | null }) {
  if (!text) return null;
  return <DropdownMenuLabel>{text}</DropdownMenuLabel>;
}
