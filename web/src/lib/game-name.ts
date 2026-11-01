import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import type { DaemonSnapshot, LibraryGame } from '@/lib/types';

export function gameName(appid: number): string {
  const snapshot = queryClient.getQueryData<DaemonSnapshot>(queryKeys.state);
  const library = queryClient.getQueryData<LibraryGame[]>(queryKeys.library);
  const name = snapshot?.games.find((game) => game.appid === appid)?.name;
  return name ?? library?.find((game) => game.appid === appid)?.name ?? `App ${appid}`;
}
