'use client';

import type { ReactNode, RefObject } from 'react';
import { cn } from '@/lib/utils';

interface ChatWorkspaceShellProps {
  viewport: ReactNode;
  composer: ReactNode;
  className?: string;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

export function ChatWorkspaceShell({
  viewport,
  composer,
  className,
  scrollContainerRef,
}: ChatWorkspaceShellProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex w-full flex-col overflow-hidden',
        className
      )}
    >
      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-linear-to-b from-background via-background/80 to-transparent blur-md" />
        <div ref={scrollContainerRef} className="h-full overflow-y-auto">
          {viewport}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-linear-to-t from-background via-background/80 to-transparent blur-md" />
      </div>
      <div className="p-4">{composer}</div>
    </div>
  );
}
