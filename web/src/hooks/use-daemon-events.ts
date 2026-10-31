import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createDaemonStream } from '@/lib/daemon-stream';

export function useDaemonEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const stream = createDaemonStream(queryClient);
    const onPageHide = () => stream.stop();
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) stream.start();
    };

    stream.start();
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      stream.stop();
    };
  }, [queryClient]);
}
