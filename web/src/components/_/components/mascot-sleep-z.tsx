import { LOGO_Z } from '../constants/logo';
import { SLEEP_Z_ANIMATIONS } from '../constants/mascot';

export function MascotSleepZ() {
  return (
    <g className="stroke-cooldown">
      {LOGO_Z.map((z, index) => (
        <path key={z.path} d={z.path} strokeWidth={z.width} className={SLEEP_Z_ANIMATIONS[index]} />
      ))}
    </g>
  );
}
