import { METER_SLOTS } from '../constants/meter';

export function SlotMeter({ count }: { count: number }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-0.5">
      {METER_SLOTS.map((slot) => (
        <span
          key={slot}
          data-filled={slot < count}
          className="h-3 w-1.5 rounded-xs bg-border data-[filled=true]:bg-foreground"
        />
      ))}
    </span>
  );
}
