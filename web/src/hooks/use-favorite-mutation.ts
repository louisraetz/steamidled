import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { AUTO_START_SAVE_ERROR } from '@/lib/constants';
import { toastTarget } from '@/lib/toast-target';
import { useSnapshotCache } from './use-snapshot';

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
        favorites: favorite ? snapshot.favorites.filter((id) => id !== appId) : [...snapshot.favorites, appId],
      }));
      toast.error(AUTO_START_SAVE_ERROR, toastTarget());
    },
    onSuccess: (snapshot) => cache.write(snapshot),
  });
}
