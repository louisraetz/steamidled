import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import type { PersonaState } from '@/lib/settings';
import { PERSONA_OPTIONS } from '../constants/session';
import { useSettingsMutation } from '../hooks/use-settings-mutation';
import { SettingSelect } from './setting-select';

export function PersonaSelect() {
  const persona = useDaemonState((snapshot) => snapshot.settings.personaState) ?? 'online';
  const canMutate = useCanMutate();
  const mutation = useSettingsMutation();

  return (
    <SettingSelect
      id="persona-state"
      label="Steam status"
      description="How friends see you while steamidled runs. Playtime counts either way."
      value={persona}
      options={PERSONA_OPTIONS}
      disabled={!canMutate}
      onValueChange={(value) => mutation.mutate({ personaState: value as PersonaState })}
    />
  );
}
