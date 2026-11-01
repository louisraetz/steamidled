import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRefreshLibrary } from '@/hooks/use-refresh-library';
import { LibraryUpdated } from './library-updated';
import { SettingsSection } from './settings-section';

export function LibrarySection() {
  const library = useRefreshLibrary();
  return (
    <SettingsSection
      title="Library"
      description="steamidled reads your games when it signs in. Refresh after you buy or receive a game."
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button variant="outline" disabled={library.disabled} pending={library.refreshing} onClick={library.refresh}>
          <RefreshCw />
          Refresh library
        </Button>
        <LibraryUpdated />
      </div>
    </SettingsSection>
  );
}
