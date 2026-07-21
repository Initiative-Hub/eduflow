'use client';

import { Link, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useAssignments } from '../../assignments/use-assignment';

export function AssignmentsClient({
  courseId,
  canCreate,
}: {
  courseId: string;
  canCreate: boolean;
}) {
  const t = useTranslations('Courses.Assignments');
  const query = useAssignments(courseId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex items-start justify-between border-b pb-5">
        <div>
          <h1 className="font-bold text-2xl">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('description')}</p>
        </div>

        {canCreate ? (
          <Button asChild>
            <Link href={`/courses/${courseId}/assignments/create`}>
              <Plus data-icon="inline-start" />
              {t('create')}
            </Link>
          </Button>
        ) : null}
      </header>

      <div className="space-y-3">
        {(query.data ?? []).map((assignment) => (
          <Link
            key={assignment.id}
            href={`/courses/${courseId}/assignments/${assignment.id}`}
            className="block rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50"
          >
            <h2 className="font-semibold">{assignment.title}</h2>

            <p className="mt-2 text-muted-foreground text-sm">
              {assignment.maxPoints} {t('points')}
            </p>

            {assignment.dueAt ? (
              <p className="mt-1 text-muted-foreground text-sm">
                {t('due')}: {new Date(assignment.dueAt).toLocaleString()}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
