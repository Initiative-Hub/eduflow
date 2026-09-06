'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface QuizProgressProps {
  current: number;
  total: number;
  className?: string;
  showLabel?: boolean;
}

export function QuizProgress({
  current,
  total,
  className,
  showLabel = true,
}: QuizProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Progress value={percentage} className="h-2 flex-1" />
      {showLabel ? (
        <span className="shrink-0 font-medium text-muted-foreground text-xs">
          {current}/{total}
        </span>
      ) : null}
    </div>
  );
}
