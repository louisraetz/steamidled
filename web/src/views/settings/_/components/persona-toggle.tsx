import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { PERSONA_LABEL, PERSONA_OPTIONS } from '../constants/session';
import { pickPersona } from '../helpers/toggle-values';
import { useSettingsMutation } from '../hooks/use-settings-mutation';

export function PersonaToggle() {
  const persona = useDaemonState((snapshot) => snapshot.settings.personaState) ?? 'online';
  const canMutate = useCanMutate();
  const mutation = useSettingsMutation();
  const select = (value: string) => {
    const next = pickPersona(value);
    if (next) mutation.mutate({ personaState: next });
  };

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label={PERSONA_LABEL}
      value={persona}
      disabled={!canMutate}
      onValueChange={select}
    >
      {PERSONA_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
