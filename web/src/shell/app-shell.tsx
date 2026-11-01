import { Redirect, useLocation } from 'wouter';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { IdlingView } from '@/views/idling/idling-view';
import { LogsView } from '@/views/logs/logs-view';
import { SettingsView } from '@/views/settings/settings-view';
import { SseLostBanner } from './_/components/sse-lost-banner';
import { TopBar } from './_/components/top-bar';
import { DEFAULT_PATH } from './_/constants/views';
import { pathForView, viewFromPath } from './_/helpers/view-path';

export function AppShell() {
  const [location, navigate] = useLocation();
  const view = viewFromPath(location);
  if (!view) return <Redirect to={DEFAULT_PATH} replace />;

  return (
    <Tabs value={view} onValueChange={(next) => navigate(pathForView(next))} className="h-dvh gap-0">
      <SseLostBanner />
      <TopBar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <TabsContent value="idling">
          <IdlingView />
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
