'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimeProvider } from '@upstash/realtime/client';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScrollbarVisibilityController } from './scrollbar-visibility-controller';

const queryClient = new QueryClient();

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider
        api={{ url: '/api/realtime', withCredentials: true }}
        maxReconnectAttempts={5}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </RealtimeProvider>
    </QueryClientProvider>
  );
}
