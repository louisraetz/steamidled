import { formatCount } from '@/lib/format';

export function GroupLabel({ title, count }: { title: string; count: number }) {
  return (
    <>
      {title}
      <span className="font-mono font-normal text-tertiary">{formatCount(count)}</span>
    </>
  );
}
