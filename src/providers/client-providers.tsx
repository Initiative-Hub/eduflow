'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScrollbarVisibilityController } from './scrollbar-visibility-controller';

const queryClient = new QueryClient();

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ScrollbarVisibilityController />
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
