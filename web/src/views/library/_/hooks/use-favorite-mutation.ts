import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSnapshotCache } from '@/hooks/use-snapshot';
import { SAVE_ERROR } from '../constants/preferences';

export function useFavoriteMutation() {
  const cache = useSnapshotCache();
  return useMutation({
    mutationFn: ({ appId, favorite }: { appId: number; favorite: boolean }) => api.setFavorite(appId, favorite),
    onMutate: async ({ appId, favorite }) => {
      await cache.cancel();
      cache.update((snapshot) => ({
        ...snapshot,
        favorites: favorite
          ? [...snapshot.favorites.filter((id) => id !== appId), appId]
          : snapshot.favorites.filter((id) => id !== appId),
      }));
    },
    onError: (_error, { appId, favorite }) => {
      cache.update((snapshot) => ({
        ...snapshot,
        favorites: favorite
          ? snapshot.favorites.filter((id) => id !== appId)
          : [...snapshot.favorites, appId],
      }));
      toast.error(SAVE_ERROR);
    },
    onSuccess: (snapshot) => cache.write(snapshot),
  });
}
