'use client';

import { ArrowLeft, CalendarDays, FileText, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AssignmentEditor } from '@/components/assignments/assignment-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  EMPTY_TIPTAP_DOCUMENT,
  type TiptapDocument,
} from '@/utils/lesson-content';
import { useCreateAssignment } from '../../../assignments/use-assignment';

export function CreateAssignmentClient({ courseId }: { courseId: string }) {
  const t = useTranslations('Courses.CreateAssignment');
  const router = useRouter();

  const createAssignment = useCreateAssignment(courseId);

  const [dueAt, setDueAt] = useState('');
  const [title, setTitle] = useState('');
  const [maxPoints, setMaxPoints] = useState('100');
  const [showErrors, setShowErrors] = useState(false);

  const handleSave = (
    data: {
      title: string;
      content: TiptapDocument;
    },
    options: {
      onSuccess: () => void;
    }
  ) => {
    setShowErrors(true);

    const parsedMaxPoints = Number(maxPoints);

    if (!title.trim()) {
      return;
    }

    if (!Number.isFinite(parsedMaxPoints) || parsedMaxPoints <= 0) {
      return;
    }

    createAssignment.mutate(
      {
        title: title.trim(),
        content: data.content,
        dueAt: dueAt ? new Date(dueAt) : null,
        maxPoints: parsedMaxPoints,
      },
      {
        onSuccess: (assignment) => {
          options.onSuccess();

          router.push(`/courses/${courseId}/assignments/${assignment.id}`);
        },
      }
    );
  };

  const maxPointsError =
    showErrors &&
    (!Number.isFinite(Number(maxPoints)) || Number(maxPoints) <= 0);

  return (
    <div className="relative mx-auto max-w-6xl space-y-8 overflow-hidden pb-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_55%)]" />

      <header className="flex items-start gap-3 border-b pb-6">
        <Button variant="ghost" size="icon" className="mt-0.5" asChild>
          <Link
            href={`/courses/${courseId}/assignments`}
            aria-label={t('back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div>
          <p className="mb-1 font-medium text-primary text-sm uppercase tracking-[0.18em]">
            {t('eyebrow')}
          </p>
          <h1 className="font-bold text-3xl text-foreground tracking-tight">
            {t('title')}
          </h1>

          <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-6">
            {t('description')}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="min-w-0 space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">{t('details')}</h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  {t('detailsDescription')}
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(10rem,0.6fr)]">
              <div className="space-y-2">
                <Label htmlFor="assignment-title">{t('assignmentTitle')}</Label>
                <Input
                  id="assignment-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('assignmentTitlePlaceholder')}
                  aria-invalid={showErrors && !title.trim()}
                />
                {showErrors && !title.trim() ? (
                  <p className="text-destructive text-sm" role="alert">
                    {t('assignmentTitleRequired')}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignment-max-points">{t('maxPoints')}</Label>
                <Input
                  id="assignment-max-points"
                  type="number"
                  min={1}
                  step="1"
                  value={maxPoints}
                  onChange={(event) => setMaxPoints(event.target.value)}
                  aria-invalid={maxPointsError}
                />
                {maxPointsError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {t('maxPointsRequired')}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card shadow-sm">
            <AssignmentEditor
              title={title}
              content={EMPTY_TIPTAP_DOCUMENT}
              canEdit
              hideTitleInput
              isSaving={createAssignment.isPending}
              startEditing
              onSave={handleSave}
            />
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="size-4" aria-hidden="true" />
              </div>
              <h2 className="font-semibold">{t('schedule')}</h2>
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="assignment-due-at">{t('dueAt')}</Label>
              <Input
                id="assignment-due-at"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
              <p className="text-muted-foreground text-xs leading-5">
                {t('dueAtDescription')}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Settings2 className="size-4" aria-hidden="true" />
              </div>
              <h2 className="font-semibold">{t('settings')}</h2>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="font-medium text-sm">{t('gradingType')}</p>
                <p className="mt-1 text-muted-foreground text-xs leading-5">
                  {t('gradingTypeDescription')}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary text-xs">
                  {t('pointsGrading')}
                </span>
              </div>

              <div className="border-t pt-5">
                <p className="font-medium text-sm">{t('submissionPolicy')}</p>
                <p className="mt-1 text-muted-foreground text-xs leading-5">
                  {t('submissionPolicyDescription')}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
