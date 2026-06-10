'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChatWorkspaceShellProps {
  viewport: ReactNode;
  composer: ReactNode;
  className?: string;
}

export function ChatWorkspaceShell({
  viewport,
  composer,
  className,
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
        <div className="h-full overflow-y-auto">{viewport}</div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-linear-to-t from-background via-background/80 to-transparent blur-md" />
      </div>
      <div className="p-4">{composer}</div>
    </div>
  );
}
