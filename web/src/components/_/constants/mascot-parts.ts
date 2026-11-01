import type { ComponentType } from 'react';
import { MascotCable } from '../components/mascot-cable';
import { MascotClosedEyes } from '../components/mascot-closed-eyes';
import { MascotOpenEyes } from '../components/mascot-open-eyes';
import { MascotSleepZ } from '../components/mascot-sleep-z';
import type { MascotPartProps, MascotVariant } from '../types/mascot';

export const MASCOT_PARTS: Record<MascotVariant, ComponentType<MascotPartProps>[]> = {
  awake: [MascotOpenEyes],
  asleep: [MascotClosedEyes, MascotSleepZ],
  unplugged: [MascotOpenEyes, MascotCable],
};
