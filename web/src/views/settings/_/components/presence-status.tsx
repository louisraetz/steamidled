import type { PersonaState } from '@/lib/settings';
import { PRESENCE } from '../constants/presence';
import { personaLabel } from '../helpers/toggle-values';

export function PresenceStatus({ persona }: { persona: PersonaState }) {
  const look = PRESENCE[persona];
  return (
    <span className="flex items-center gap-2 text-sm">
      <span aria-hidden="true" className={look.indicatorClassName} />
      <span className={look.labelClassName}>{personaLabel(persona)}</span>
    </span>
  );
}
