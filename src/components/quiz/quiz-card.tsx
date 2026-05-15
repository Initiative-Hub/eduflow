'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface QuizCardProps {
  children: ReactNode;
  className?: string;
}

export function QuizCard({ children, className }: QuizCardProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

interface QuizCardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function QuizCardHeader({ children, className }: QuizCardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b bg-muted/30 px-5 py-3',
        className
      )}
    >
      {children}
    </div>
  );
}

interface QuizCardContentProps {
  children: ReactNode;
  className?: string;
}

export function QuizCardContent({ children, className }: QuizCardContentProps) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

interface QuizCardFooterProps {
  children: ReactNode;
  className?: string;
}

export function QuizCardFooter({ children, className }: QuizCardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-t bg-muted/20 px-5 py-3',
        className
      )}
    >
      {children}
    </div>
  );
}
