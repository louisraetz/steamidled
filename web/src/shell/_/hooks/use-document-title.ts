import { useEffect } from 'react';
import { useSessionGain } from '@/hooks/use-session-gain';
import { useConnectionStore } from '@/stores/connection-store';
import { documentTitle } from '../helpers/document-title';

export function useDocumentTitle(): void {
  const disconnected = useConnectionStore((state) => state.status === 'reconnecting');
  const { gainedMs, counting } = useSessionGain();
  const title = documentTitle(disconnected, counting, gainedMs);

  useEffect(() => {
    document.title = title;
  }, [title]);
}
