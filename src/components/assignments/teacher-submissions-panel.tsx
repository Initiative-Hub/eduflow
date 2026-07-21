'use client';

import { Download, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type {
  Assignment,
  TeacherAssignmentSubmission,
} from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import { assignmentService } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import {
  useAssignmentSubmissions,
  useGradeSubmission,
} from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/use-assignment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function TeacherSubmissionsPanel({
  assignment,
}: {
  assignment: Assignment;
}) {
  const t = useTranslations('Courses.AssignmentTeacher');
  const submissionsQuery = useAssignmentSubmissions(assignment.id);
  const gradeMutation = useGradeSubmission(assignment.id);

  if (submissionsQuery.isLoading) {
    return <div className="mt-8 h-48 animate-pulse rounded-2xl bg-muted" />;
  }

  const submissions = submissionsQuery.data ?? [];

  return (
    <section className="mt-8 rounded-2xl border bg-card p-6">
      <h2 className="font-semibold text-lg">{t('title')}</h2>

      <div className="mt-5 space-y-5">
        {submissions.map((submission) => (
          <SubmissionRow
            key={submission.id}
            assignment={assignment}
            submission={submission}
            isSaving={gradeMutation.isPending}
            onGrade={(data) =>
              gradeMutation.mutate({
                submissionId: submission.id,
                ...data,
              })
            }
          />
        ))}
      </div>
    </section>
  );
}

function SubmissionRow({
  assignment,
  submission,
  isSaving,
  onGrade,
}: {
  assignment: Assignment;
  submission: TeacherAssignmentSubmission;
  isSaving: boolean;
  onGrade: (data: { score: number; feedback?: string }) => void;
}) {
  const t = useTranslations('Courses.AssignmentTeacher');
  const [score, setScore] = useState(submission.score?.toString() ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');

  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {submission.student?.name ?? t('student')}
          </p>
          <p className="text-muted-foreground text-sm">
            {submission.student?.email}
          </p>
        </div>

        <span className="rounded-full bg-muted px-3 py-1 text-xs">
          {submission.status}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {submission.files.map((entry) => (
          <a
            key={entry.id}
            href={assignmentService.fileDownloadUrl(entry.file.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm underline"
          >
            <Download className="size-4" />
            {entry.file.name}
          </a>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[10rem_1fr_auto]">
        <Input
          type="number"
          min={0}
          max={assignment.maxPoints}
          value={score}
          onChange={(event) => setScore(event.target.value)}
          placeholder={t('scorePlaceholder')}
        />

        <Textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder={t('feedbackPlaceholder')}
          rows={2}
        />

        <Button
          onClick={() =>
            onGrade({
              score: Number(score),
              feedback,
            })
          }
          disabled={isSaving || score === ''}
        >
          <Save data-icon="inline-start" />
          {t('saveGrade')}
        </Button>
      </div>
    </article>
  );
}
