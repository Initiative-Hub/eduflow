'use client';

import { CalendarClock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getDueKind } from './assignment-list-types';

export function AssignmentDueDate({
  dueAt,
  locale,
  now,
}: {
  dueAt: string | null;
  locale: string;
  now: number;
}) {
  const t = useTranslations('Courses.Assignments');
  const kind = getDueKind(dueAt, now);

  if (kind === 'none') {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <CalendarClock className="size-3.5" aria-hidden="true" />
        {t('noDeadline')}
      </span>
    );
  }

  const dueDate = new Date(dueAt as string);
  const dueLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(dueDate);

  const urgencyLabel =
    kind === 'overdue'
      ? t('overdue')
      : kind === 'today'
        ? t('dueToday')
        : kind === 'tomorrow'
          ? t('dueTomorrow')
          : null;

  return (
    <span
      className={cn(
        'inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap',
        kind === 'overdue'
          ? 'text-destructive'
          : kind === 'today'
            ? 'text-primary'
            : 'text-muted-foreground'
      )}
    >
      <CalendarClock className="size-3.5" aria-hidden="true" />
      <span className="truncate">
        {t('due')}: {dueLabel}
        {urgencyLabel ? (
          <span className="font-medium"> · {urgencyLabel}</span>
        ) : null}
      </span>
    </span>
  );
}
