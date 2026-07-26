'use client';

import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Send,
  Settings2,
} from 'lucide-react';
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
  const [content, setContent] = useState<TiptapDocument>(EMPTY_TIPTAP_DOCUMENT);
  const [showErrors, setShowErrors] = useState(false);

  const handlePublish = () => {
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
        content,
        dueAt: dueAt ? new Date(dueAt) : null,
        maxPoints: parsedMaxPoints,
      },
      {
        onSuccess: (assignment) => {
          router.push(`/courses/${courseId}/assignments/${assignment.id}`);
        },
      }
    );
  };

  const maxPointsError =
    showErrors &&
    (!Number.isFinite(Number(maxPoints)) || Number(maxPoints) <= 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" className="mt-1" asChild>
            <Link
              href={`/courses/${courseId}/assignments`}
              aria-label={t('back')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div>
            <p className="mb-1 font-medium text-primary text-sm tracking-wide">
              {t('eyebrow')}
            </p>
            <h1 className="font-bold text-3xl text-foreground tracking-tight md:text-4xl">
              {t('title')}
            </h1>

            <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-6">
              {t('description')}
            </p>
          </div>
        </div>

        <Button
          onClick={handlePublish}
          disabled={createAssignment.isPending}
          className="w-full sm:w-auto"
        >
          <Send data-icon="inline-start" />
          {createAssignment.isPending ? t('publishing') : t('publish')}
        </Button>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <main className="min-w-0 space-y-6">
          <section className="rounded-xl border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">{t('details')}</h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  {t('detailsDescription')}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_11rem]">
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
                  className="tabular-nums"
                />
                {maxPointsError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {t('maxPointsRequired')}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <AssignmentEditor
              title={title}
              content={content}
              canEdit
              appearance="embedded"
              hideTitleInput
              showActions={false}
              startEditing
              onContentChange={setContent}
            />
          </section>
        </main>

        <aside className="lg:sticky lg:top-20">
          <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-semibold">{t('schedule')}</h2>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {t('scheduleDescription')}
                  </p>
                </div>
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
            </div>

            <div className="border-t bg-muted/20 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-background text-primary shadow-sm ring-1 ring-border">
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
                  <span className="mt-3 inline-flex rounded-md bg-primary/10 px-2.5 py-1 font-medium text-primary text-xs">
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
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
