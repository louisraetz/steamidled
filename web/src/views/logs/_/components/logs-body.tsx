import type { LogsController } from '../types/logs-controller';
import { LogList } from './log-list';
import { LogsEmpty } from './logs-empty';
import { LogsSkeleton } from './logs-skeleton';

export function LogsBody({ controller }: { controller: LogsController }) {
  if (controller.loading) return <LogsSkeleton />;
  if (controller.visible.length === 0) {
    return <LogsEmpty levels={controller.levels} total={controller.entries.length} onShowAll={controller.showAll} />;
  }
  return <LogList entries={controller.visible} total={controller.entries.length} />;
}
