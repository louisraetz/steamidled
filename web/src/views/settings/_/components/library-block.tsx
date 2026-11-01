import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRefreshLibrary } from '@/hooks/use-refresh-library';
import { LibraryUpdated } from './library-updated';
import { SettingsBlock } from './settings-block';

export function LibraryBlock() {
  const library = useRefreshLibrary();
  return (
    <SettingsBlock
      title="Library"
      description="Updated automatically when Steam reports new games."
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button variant="outline" disabled={library.disabled} pending={library.refreshing} onClick={library.refresh}>
          <RefreshCw />
          Refresh library
        </Button>
        <LibraryUpdated />
      </div>
    </SettingsBlock>
  );
}
