import { ToggleGroup } from '@/components/ui/toggle-group';
import { useCanMutate } from '@/hooks/use-can-mutate';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { PROFILE_PICKER_LABEL } from '../constants/profiles';
import { profileTiles } from '../helpers/profile-tiles';
import type { ScheduleProfileState } from '../types/schedule-profile-state';
import { ProfileTile } from './profile-tile';

interface ProfilePickerProps {
  profile: ScheduleProfileState;
  enabled: boolean;
}

export function ProfilePicker({ profile, enabled }: ProfilePickerProps) {
  const tiles = useDaemonState(profileTiles) ?? [];
  const canMutate = useCanMutate();

  return (
    <ToggleGroup
      type="single"
      variant="tile"
      size="tile"
      spacing={2}
      aria-label={PROFILE_PICKER_LABEL}
      value={profile.selected}
      disabled={!canMutate}
      onValueChange={profile.select}
      className="grid w-full grid-cols-1 items-stretch gap-2 md:grid-cols-2 lg:grid-cols-4"
    >
      {tiles.map((tile) => (
        <ProfileTile key={tile.value} tile={tile} inert={!enabled} />
      ))}
    </ToggleGroup>
  );
}
