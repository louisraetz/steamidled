import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrandMark } from '@/components/brand-mark';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { VIEWS } from '../constants/views';
import { ConnectionStatus } from './connection-status';

export function TopBar() {
  const accountName = useDaemonState((snapshot) => snapshot.accountName);

  return (
    <header className="shrink-0 border-b">
      <div className="mx-auto flex max-w-7xl flex-col px-4 sm:h-16 sm:flex-row sm:items-center sm:gap-8 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4 sm:h-auto">
          <BrandMark className="size-8" />
          <div className="min-w-0 sm:hidden">
            <ConnectionStatus />
          </div>
        </div>
        <TabsList variant="line" className="grid w-full grid-cols-3 sm:flex sm:h-full sm:w-fit">
          {VIEWS.map((view) => (
            <TabsTrigger key={view.value} value={view.value}>
              {view.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="ml-auto hidden min-w-0 items-center gap-6 sm:flex">
          <ConnectionStatus />
          <span className="hidden truncate text-muted-foreground lg:inline">{accountName}</span>
        </div>
      </div>
    </header>
  );
}
