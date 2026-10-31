import { QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from '@/lib/query-client';
import { ConnectionGate } from '@/shell/connection-gate';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={400}>
        <Router hook={useHashLocation}>
          <ConnectionGate />
        </Router>
        <Toaster position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
