'use client';

import { Download, FileText, Save } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import type {
  Assignment,
  TeacherAssignmentSubmission,
} from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import { assignmentService } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type TeacherSubmissionReviewProps = {
  assignment: Assignment;
  submission: TeacherAssignmentSubmission;
  isSaving: boolean;
  onGrade: (data: { score: number; feedback?: string }) => void;
};

export function TeacherSubmissionReview({
  assignment,
  submission,
  isSaving,
  onGrade,
}: TeacherSubmissionReviewProps) {
  const t = useTranslations('Courses.AssignmentTeacher');
  const locale = useLocale();
  const [score, setScore] = useState(submission.score?.toString() ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const studentName = submission.student?.name ?? t('student');
  const parsedScore = Number(score);
  const scoreIsValid =
    score.trim() !== '' &&
    Number.isFinite(parsedScore) &&
    parsedScore >= 0 &&
    parsedScore <= assignment.maxPoints;

  return (
    <article className="min-w-0 bg-muted/10">
      <div className="flex flex-col gap-3 border-b bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-semibold">{studentName}</p>
          <p className="mt-0.5 truncate text-muted-foreground text-sm">
            {submission.student?.email}
          </p>
        </div>
        <Badge
          variant={submission.status === 'GRADED' ? 'default' : 'secondary'}
        >
          {t(`status${submission.status}`)}
        </Badge>
      </div>

      <div className="space-y-5 p-5 md:p-6">
        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="font-semibold">{t('submissionFiles')}</h3>
              <p className="mt-1 text-muted-foreground text-xs">
                {submission.submittedAt
                  ? t('submittedAt', {
                      date: new Intl.DateTimeFormat(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(submission.submittedAt)),
                    })
                  : t('notSubmitted')}
              </p>
            </div>
          </div>

          {submission.files.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {submission.files.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">
                      {entry.file.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatFileSize(entry.file.fileSize)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" asChild>
                    <a
                      href={assignmentService.fileDownloadUrl(entry.file.id)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t('downloadFile', { name: entry.file.name })}
                    >
                      <Download />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
              {t('noFiles')}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div>
            <h3 className="font-semibold">{t('assessment')}</h3>
            <p className="mt-1 text-muted-foreground text-sm">
              {t('assessmentDescription')}
            </p>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[10rem_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor={`score-${submission.id}`}>
                {t('finalScore')}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`score-${submission.id}`}
                  type="number"
                  min={0}
                  max={assignment.maxPoints}
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                  placeholder="—"
                  aria-invalid={score !== '' && !scoreIsValid}
                  className="text-center font-semibold tabular-nums"
                />
                <span className="shrink-0 text-muted-foreground text-sm">
                  / {assignment.maxPoints}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`feedback-${submission.id}`}>
                {t('feedback')}
              </Label>
              <Textarea
                id={`feedback-${submission.id}`}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder={t('feedbackPlaceholder', { name: studentName })}
                rows={4}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={() =>
                onGrade({
                  score: parsedScore,
                  feedback: feedback.trim() || undefined,
                })
              }
              disabled={isSaving || !scoreIsValid}
            >
              <Save data-icon="inline-start" />
              {isSaving ? t('savingGrade') : t('saveGrade')}
            </Button>
          </div>
        </section>
      </div>
    </article>
  );
}

function formatFileSize(bytes: number | null) {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
