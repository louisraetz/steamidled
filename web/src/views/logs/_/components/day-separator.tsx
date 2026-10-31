import { Separator } from '@/components/ui/separator';

export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2 text-xs text-tertiary">
      <span className="shrink-0">{label}</span>
      <Separator className="flex-1" />
    </div>
  );
}
