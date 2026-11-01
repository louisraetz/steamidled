import { pluralize } from '@/lib/format';
import type { FlushIntervalHours, PersonaState } from '@/lib/settings';
import { FLUSH_INTERVAL_OPTIONS } from '@/lib/settings';
import type { SelectOption } from '../types/select-option';

export const PERSONA_OPTIONS: readonly (SelectOption & { value: PersonaState })[] = [
  { value: 'online', label: 'Online' },
  { value: 'away', label: 'Away' },
  { value: 'offline', label: 'Offline' },
];

export const FLUSH_OPTIONS: readonly SelectOption[] = FLUSH_INTERVAL_OPTIONS.map((hours: FlushIntervalHours) => ({
  value: String(hours),
  label: `${hours} ${pluralize(hours, 'hour')}`,
}));
