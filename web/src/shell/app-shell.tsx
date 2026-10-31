import { Redirect, useLocation } from 'wouter';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useDaemonState } from '@/hooks/use-daemon-state';
import { IdlingView } from '@/views/idling/idling-view';
import { LibraryView } from '@/views/library/library-view';
import { LogsView } from '@/views/logs/logs-view';
import { SettingsView } from '@/views/settings/settings-view';
import { SseLostBanner } from './_/components/sse-lost-banner';
import { TopBar } from './_/components/top-bar';
import { defaultPath, isSettling, pathForView, viewFromPath } from './_/helpers/view-path';

export function AppShell() {
  const [location, navigate] = useLocation();
  const view = viewFromPath(location);
  const redirectTo = useDaemonState((snapshot) => (isSettling(snapshot) ? null : defaultPath(snapshot)));
  if (!view && redirectTo) return <Redirect to={redirectTo} replace />;

  return (
    <Tabs
      value={view ?? 'idling'}
      onValueChange={(next) => navigate(pathForView(next))}
      className="h-dvh gap-0"
    >
      <SseLostBanner />
      <TopBar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <TabsContent value="idling">
          <IdlingView />
        </TabsContent>
        <TabsContent value="library" className="h-full">
          <LibraryView />
        </TabsContent>
        <TabsContent value="logs" className="h-full">
          <LogsView />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsView />
        </TabsContent>
      </main>
    </Tabs>
  );
}
