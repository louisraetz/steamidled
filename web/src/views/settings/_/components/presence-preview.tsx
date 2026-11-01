import { Item, ItemContent, ItemMedia } from '@/components/ui/item';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { PRESENCE } from '../constants/presence';
import { PRESENCE_NOTE } from '../constants/session';
import { MascotAvatar } from './mascot-avatar';
import { PresenceStatus } from './presence-status';

export function PresencePreview() {
  const persona = useDaemonState((snapshot) => snapshot.settings.personaState) ?? 'online';
  const accountName = useDaemonState((snapshot) => snapshot.accountName);
  const look = PRESENCE[persona];

  return (
    <div className="flex flex-col gap-3">
      <Item size="flush">
        <ItemMedia>
          <MascotAvatar key={persona} variant={look.mascot} className={look.mascotClassName} />
        </ItemMedia>
        <ItemContent className="min-w-0 gap-0.5">
          <span className="truncate font-semibold">{accountName}</span>
          <PresenceStatus persona={persona} />
        </ItemContent>
      </Item>
      <p className="text-sm text-muted-foreground">{PRESENCE_NOTE}</p>
    </div>
  );
}
