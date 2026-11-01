import type { GameGroup } from '../types/game-group';
import { IdlingListGroup } from './idling-list-group';

export function IdlingList({ groups }: { groups: GameGroup[] }) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <IdlingListGroup key={group.key} group={group} />
      ))}
    </div>
  );
}
