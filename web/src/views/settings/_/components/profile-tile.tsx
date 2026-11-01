import { useId } from 'react';
import { ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ProfileTileModel } from '../types/profile-tile';
import { ProfileTileLine } from './profile-tile-line';

interface ProfileTileProps {
  tile: ProfileTileModel;
  inert: boolean;
}

export function ProfileTile({ tile, inert }: ProfileTileProps) {
  const detailsId = useId();
  return (
    <ToggleGroupItem value={tile.value} aria-label={tile.label} aria-describedby={detailsId} aria-disabled={inert}>
      <span className="font-semibold">{tile.label}</span>
      <span id={detailsId} className="flex flex-col gap-1">
        <span className="text-sm text-balance text-muted-foreground group-aria-disabled/tile:text-tertiary">
          {tile.sentence}
        </span>
        <ProfileTileLine parts={tile.ranges} className="text-muted-foreground group-aria-disabled/tile:text-tertiary" />
        <ProfileTileLine parts={tile.share} className="text-tertiary" />
      </span>
    </ToggleGroupItem>
  );
}
