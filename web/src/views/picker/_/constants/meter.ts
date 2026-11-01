import { MAX_IDLE_GAMES } from '@/lib/constants';

export const METER_SLOTS = Array.from({ length: MAX_IDLE_GAMES }, (_, index) => index);
