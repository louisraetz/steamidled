import type { ReactNode } from 'react';
import { Infinity as InfinityIcon, Star } from 'lucide-react';
import { useGamePreferences } from '@/hooks/use-game-preferences';
import { useSelectionLock } from '@/hooks/use-selection-lock';
import { AUTO_START_TOOLTIP } from '@/lib/constants';
import { PreferenceToggle } from '@/components/preference-toggle';
import { NO_COOLDOWN_TOOLTIP } from '../constants/actions';
import { removeGame } from '../helpers/remove-game';
import { RemoveGameButton } from './remove-game-button';

interface GameActionsProps {
  appid: number;
  name: string;
  children?: ReactNode;
}

export function GameActions({ appid, name, children }: GameActionsProps) {
  const preferences = useGamePreferences();
  const selectionLock = useSelectionLock();

  return (
    <div className="flex flex-1 items-center justify-end gap-1">
      <PreferenceToggle
        icon={Star}
        filled
        tone="foreground"
        label={`Auto-start ${name}`}
        tooltip={AUTO_START_TOOLTIP}
        pressed={preferences.favorites.includes(appid)}
        disabled={preferences.locked}
        onToggle={() => preferences.toggleFavorite(appid)}
      />
      <PreferenceToggle
        icon={InfinityIcon}
        tone="success"
        label={`No cooldown for ${name}`}
        tooltip={NO_COOLDOWN_TOOLTIP}
        pressed={preferences.exemptAppId === appid}
        disabled={preferences.locked}
        onToggle={() => preferences.toggleExempt(appid)}
      />
      <RemoveGameButton
        label={`Remove ${name}`}
        disabled={selectionLock !== null}
        onRemove={() => removeGame(appid, name)}
      />
      {children}
    </div>
  );
}
