import { EMPTY_IDS } from '@/lib/constants';
import { gameName } from '@/lib/game-name';
import { useCanMutate } from './use-can-mutate';
import { useDaemonState } from './use-daemon-state';
import { useExemptMutation } from './use-exempt-mutation';
import { useFavoriteMutation } from './use-favorite-mutation';
import { useStableCallback } from './use-stable-callback';

export function useGamePreferences() {
  const favorites = useDaemonState((snapshot) => snapshot.favorites) ?? EMPTY_IDS;
  const exemptAppId = useDaemonState((snapshot) => snapshot.exemptAppId) ?? null;
  const canMutate = useCanMutate();
  const favoriteMutation = useFavoriteMutation();
  const exemptMutation = useExemptMutation();

  const toggleFavorite = useStableCallback((appid: number) => {
    if (!canMutate) return;
    favoriteMutation.mutate({ appId: appid, favorite: !favorites.includes(appid) });
  });

  const toggleExempt = useStableCallback((appid: number) => {
    if (!canMutate) return;
    if (exemptAppId === appid) {
      exemptMutation.mutate({ appId: null, name: null, previous: null, announce: false });
      return;
    }
    const previous = exemptAppId === null ? null : { appId: exemptAppId, name: gameName(exemptAppId) };
    exemptMutation.mutate({ appId: appid, name: gameName(appid), previous, announce: true });
  });

  return { favorites, exemptAppId, locked: !canMutate, toggleFavorite, toggleExempt };
}
