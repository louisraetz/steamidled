import type { FlushIntervalHours, PersonaState } from '@/lib/settings';
import { FLUSH_INTERVAL_OPTIONS } from '@/lib/settings';

export const PERSONA_OPTIONS: readonly { value: PersonaState; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'away', label: 'Away' },
  { value: 'offline', label: 'Offline' },
];

export const FLUSH_OPTIONS: readonly { value: string; hours: FlushIntervalHours; label: string }[] =
  FLUSH_INTERVAL_OPTIONS.map((hours) => ({ value: String(hours), hours, label: `${hours}h` }));

export const PERSONA_LABEL = 'Steam status';
export const FLUSH_LABEL = 'Commit playtime every';
export const PRESENCE_NOTE = 'This is what friends see. Playtime counts either way.';
