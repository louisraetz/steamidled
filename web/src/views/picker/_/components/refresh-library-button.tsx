import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRefreshLibrary } from '@/hooks/use-refresh-library';
import { REFRESH_LIBRARY_LABEL } from '../constants/picker';

export function RefreshLibraryButton() {
  const library = useRefreshLibrary();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="quiet"
          size="icon-sm"
          aria-label={REFRESH_LIBRARY_LABEL}
          aria-busy={library.refreshing}
          disabled={library.disabled}
          onClick={library.refresh}
        >
          <RefreshCw data-spinning={library.refreshing} className="motion-safe:data-[spinning=true]:animate-spin" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{REFRESH_LIBRARY_LABEL}</TooltipContent>
    </Tooltip>
  );
}
