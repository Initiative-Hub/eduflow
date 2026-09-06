'use client';

import { AlertCircle, Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function AssignmentsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>

      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-5" aria-hidden="true" />
      </span>

      <p className="mt-4 max-w-sm text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('Courses.Assignments');

  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-5" aria-hidden="true" />
      </span>

      <p className="mt-4 max-w-sm text-muted-foreground text-sm">
        {t('loadError')}
      </p>

      <Button variant="outline" className="mt-5" onClick={onRetry}>
        {t('retry')}
      </Button>
    </div>
  );
}
