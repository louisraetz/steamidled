import { Page } from '@/components/page';
import { CopyVisibleButton } from './_/components/copy-visible-button';
import { LevelFilter } from './_/components/level-filter';
import { LogsBody } from './_/components/logs-body';
import { useLogsController } from './_/hooks/use-logs-controller';

export function LogsView() {
  const controller = useLogsController();
  return (
    <Page layout="screen">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-4">
        <h1 className="text-xl font-semibold">Logs</h1>
        <div className="flex flex-wrap items-center gap-2">
          <LevelFilter value={controller.levels} counts={controller.counts} onChange={controller.setLevels} />
          <CopyVisibleButton entries={controller.visible} />
        </div>
      </div>
      <LogsBody controller={controller} />
    </Page>
  );
}
