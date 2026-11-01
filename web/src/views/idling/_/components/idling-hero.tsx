import { IdleMascot } from '@/components/idle-mascot';
import { Odometer } from '@/components/odometer';
import { RichText } from '@/components/rich-text';
import { useHero } from '../hooks/use-hero';

export function IdlingHero() {
  const hero = useHero();
  return (
    <div className="flex w-full flex-col gap-3">
      <div data-sleeping={hero.sleeping} className="group/hero flex items-center gap-4">
        <IdleMascot variant="asleep" className="hidden size-12 group-data-[sleeping=true]/hero:block sm:size-14" />
        <Odometer value={hero.value} label={hero.label} className="text-5xl leading-none sm:text-6xl lg:text-7xl" />
      </div>
      <p className="text-muted-foreground">
        <RichText parts={hero.caption} />
      </p>
    </div>
  );
}
