'use client';

import { ArrowLeft } from 'lucide-react';
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

    if (!data.title.trim()) {
      return;
    }

    if (!Number.isFinite(parsedMaxPoints) || parsedMaxPoints <= 0) {
      return;
    }

    createAssignment.mutate(
      {
        title: data.title.trim(),
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
    <div className="mx-auto max-w-5xl space-y-7 pb-12">
      <header className="flex items-start gap-3 border-b pb-5">
        <Button variant="ghost" size="icon" className="mt-0.5" asChild>
          <Link
            href={`/courses/${courseId}/assignments`}
            aria-label={t('back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div>
          <h1 className="font-bold text-2xl text-foreground">{t('title')}</h1>

          <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-6">
            {t('description')}
          </p>
        </div>
      </header>

      <section className="grid gap-5 rounded-2xl border bg-card p-5 md:grid-cols-2 md:p-6">
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

        <div className="space-y-2">
          <Label htmlFor="assignment-due-at">{t('dueAt')}</Label>

          <Input
            id="assignment-due-at"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 md:p-6">
        <AssignmentEditor
          title=""
          content={EMPTY_TIPTAP_DOCUMENT}
          canEdit
          startEditing
          onSave={handleSave}
        />
      </section>
    </div>
  );
}
