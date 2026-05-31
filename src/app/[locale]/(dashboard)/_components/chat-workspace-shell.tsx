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
      <div className="flex-1 overflow-y-auto">{viewport}</div>
      <div className="px-4 py-6">{composer}</div>
    </div>
  );
}
