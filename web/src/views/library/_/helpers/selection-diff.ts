export function countChanges(draft: readonly number[], server: readonly number[]): number {
  const serverSet = new Set(server);
  const draftSet = new Set(draft);
  const added = draft.filter((appid) => !serverSet.has(appid)).length;
  const removed = server.filter((appid) => !draftSet.has(appid)).length;
  return added + removed;
}

export function toggleInList(list: readonly number[], appid: number): number[] {
  if (list.includes(appid)) return list.filter((entry) => entry !== appid);
  return [...list, appid];
}
