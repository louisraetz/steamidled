import { OPEN_EYES } from '../constants/mascot';
import type { MascotPartProps } from '../types/mascot';

export function MascotOpenEyes({ blink }: MascotPartProps) {
  return (
    <g
      data-blink={blink}
      className="origin-center fill-background transform-fill motion-safe:data-[blink=true]:animate-mascot-blink"
    >
      {OPEN_EYES.map((eye) => (
        <circle key={eye.cx} cx={eye.cx} cy={eye.cy} r={eye.r} />
      ))}
    </g>
  );
}
