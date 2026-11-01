import type { FlushIntervalHours, PersonaState, ScheduleProfile } from '@/lib/settings';
import { PROFILE_OPTIONS } from '../constants/profiles';
import { FLUSH_OPTIONS, PERSONA_OPTIONS } from '../constants/session';

export function pickPersona(value: string): PersonaState | null {
  return PERSONA_OPTIONS.find((option) => option.value === value)?.value ?? null;
}

export function pickFlushInterval(value: string): FlushIntervalHours | null {
  return FLUSH_OPTIONS.find((option) => option.value === value)?.hours ?? null;
}

export function personaLabel(persona: PersonaState): string {
  return PERSONA_OPTIONS.find((option) => option.value === persona)?.label ?? persona;
}

export function pickProfile(value: string): ScheduleProfile | null {
  return PROFILE_OPTIONS.find((option) => option.value === value)?.value ?? null;
}
