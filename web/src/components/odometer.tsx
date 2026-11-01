import { cn } from '@/lib/utils';
import { OdometerCell } from './_/components/odometer-cell';
import { odometerChars } from './_/helpers/odometer-chars';
import { useOdometerIntro } from './_/hooks/use-odometer-intro';

interface OdometerProps {
  value: string;
  label: string;
  className?: string;
}

export function Odometer({ value, label, className }: OdometerProps) {
  const intro = useOdometerIntro();
  return (
    <span data-slot="odometer" data-intro={intro} className={cn('inline-block font-sans font-bold', className)}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="inline-flex">
        {odometerChars(value).map((char) => (
          <OdometerCell key={char.key} char={char} />
        ))}
      </span>
    </span>
  );
}
