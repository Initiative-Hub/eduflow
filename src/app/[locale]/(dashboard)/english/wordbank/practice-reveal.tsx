'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function PracticeReveal({
  children,
  enabled,
  label,
}: {
  children: ReactNode;
  enabled: boolean;
  label: string;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!enabled) return <>{children}</>;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => setRevealed(true)}
      onFocus={() => setRevealed(true)}
      className={cn(
        'rounded-md text-left transition-[background-color,color,filter] duration-200 focus-visible:ring-3 focus-visible:ring-ring/50',
        !revealed &&
          'cursor-pointer bg-muted/70 text-muted-foreground blur-sm hover:bg-muted/30 hover:text-foreground hover:blur-0'
      )}
    >
      {children}
    </button>
  );
}
