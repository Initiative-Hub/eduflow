'use client';

import { Download, FileText, Save, Sparkles, Undo2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { assignmentService } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import type {
  Assignment,
  FeedbackTone,
  FinalizedAssignmentSubmission,
  TeacherAssignmentStudent,
} from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.types';
import { useRewriteAssignmentFeedback } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/use-assignment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type TeacherSubmissionReviewProps = {
  assignment: Assignment;
  student: TeacherAssignmentStudent;
  submission: FinalizedAssignmentSubmission;
  isSaving: boolean;
  onGrade: (data: { score: number; feedback?: string }) => void;
};

export function TeacherSubmissionReview({
  assignment,
  student,
  submission,
  isSaving,
  onGrade,
}: TeacherSubmissionReviewProps) {
  const t = useTranslations('Courses.AssignmentTeacher');
  const locale = useLocale();
  const [score, setScore] = useState(submission.score?.toString() ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const parsedScore = Number(score);
  const scoreIsValid =
    score.trim() !== '' &&
    Number.isFinite(parsedScore) &&
    parsedScore >= 0 &&
    parsedScore <= assignment.maxPoints;

  const rewriteFeedback = useRewriteAssignmentFeedback();
  const [feedbackBeforeAi, setFeedbackBeforeAi] = useState<string | null>(null);

  const [feedbackTone, setFeedbackTone] =
    useState<FeedbackTone>('constructive');

  const handleEnhanceFeedback = () => {
    const draft = feedback.trim();

    if (!draft) return;

    rewriteFeedback.mutate(
      {
        submissionId: submission.id,
        feedback: draft,
        tone: feedbackTone,
      },
      {
        onSuccess: ({ suggestion }) => {
          setFeedbackBeforeAi(feedback);
          setFeedback(suggestion);
        },
      }
    );
  };
  return (
    <article className="min-w-0 bg-muted/10">
      <div className="flex flex-col gap-3 border-b bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-semibold">{student.name}</p>
          <p className="mt-0.5 truncate text-muted-foreground text-sm">
            {student.email}
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

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={`feedback-${submission.id}`}>
                  {t('feedback')}
                </Label>

                <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                  {feedbackBeforeAi !== null && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFeedback(feedbackBeforeAi);
                        setFeedbackBeforeAi(null);
                      }}
                    >
                      <Undo2 data-icon="inline-start" />
                      {t('undoAiFeedback')}
                    </Button>
                  )}

                  <Select
                    value={feedbackTone}
                    onValueChange={(value) =>
                      setFeedbackTone(value as FeedbackTone)
                    }
                    disabled={rewriteFeedback.isPending || isSaving}
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={t('feedbackTone')}
                      className="w-full min-w-0 sm:w-52"
                    >
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="constructive">
                        {t('toneConstructive')}
                      </SelectItem>
                      <SelectItem value="concise">
                        {t('toneConcise')}
                      </SelectItem>
                      <SelectItem value="encouraging">
                        {t('toneEncouraging')}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEnhanceFeedback}
                    disabled={
                      !feedback.trim() || rewriteFeedback.isPending || isSaving
                    }
                  >
                    <Sparkles data-icon="inline-start" />
                    {rewriteFeedback.isPending
                      ? t('enhancingFeedback')
                      : t('enhanceFeedback')}
                  </Button>
                </div>
              </div>

              <Textarea
                id={`feedback-${submission.id}`}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder={t('feedbackPlaceholder', { name: student.name })}
                rows={6}
                readOnly={rewriteFeedback.isPending || isSaving}
                aria-busy={rewriteFeedback.isPending}
                className="min-h-32 resize-y bg-background leading-relaxed"
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
              disabled={isSaving || rewriteFeedback.isPending || !scoreIsValid}
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
