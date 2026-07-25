'use client';

import { CalendarClock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
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

  const relativeLabel =
    kind === 'overdue'
      ? t('overdue')
      : kind === 'today'
        ? t('dueToday')
        : kind === 'tomorrow'
          ? t('dueTomorrow')
          : t('dueInDays', {
              count: Math.max(
                1,
                Math.ceil((dueDate.getTime() - now) / (24 * 60 * 60 * 1000))
              ),
            });

  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-1.5',
        kind === 'overdue'
          ? 'text-destructive'
          : kind === 'today'
            ? 'text-primary'
            : 'text-muted-foreground'
      )}
    >
      <CalendarClock className="size-3.5" aria-hidden="true" />
      <span>
        {t('due')}: {dueLabel}
      </span>
      <Badge
        variant={
          kind === 'overdue'
            ? 'destructive'
            : kind === 'today'
              ? 'default'
              : 'secondary'
        }
      >
        {relativeLabel}
      </Badge>
    </span>
  );
}
