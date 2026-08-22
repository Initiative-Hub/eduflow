'use client';

import { CheckCircle2, LoaderCircle, Send, UploadCloud } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';
import type { Assignment } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.types';
import { useAssignmentSubmission } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/use-assignment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SubmissionFileList } from './submission-file-list';

export function StudentSubmissionPanel({
  assignment,
}: {
  assignment: Assignment;
}) {
  const t = useTranslations('Courses.AssignmentStudent');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { upload, submit, removeFile } = useAssignmentSubmission(assignment.id);

  const removingFileId = removeFile.isPending
    ? removeFile.variables
    : undefined;

  const submission = assignment.submission;
  const draftSubmission = assignment.draftSubmission;
  const isPastDue = assignment.dueAt
    ? new Date(assignment.dueAt).getTime() < Date.now()
    : false;

  const canUpload = !isPastDue;

  const canSubmit = Boolean(draftSubmission?.files.length) && !isPastDue;

  const uploadFile = async (file?: File) => {
    if (!file || !canUpload || upload.isPending) return;
    await upload.mutateAsync(file);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await uploadFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = async (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await uploadFile(event.dataTransfer.files?.[0]);
  };

  const status = submission?.status ?? 'DRAFT';

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="font-semibold text-lg tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {t('description')}
          </p>
        </div>
        <SubmissionStatus status={status} />
      </div>

      <div className="space-y-5 p-5">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        {!isPastDue && submission && !draftSubmission ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground text-sm">
            {t('resubmitDescription')}
          </p>
        ) : null}

        {submission && draftSubmission ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground text-sm">
            {t('draftInProgress')}
          </p>
        ) : null}

        {canUpload ? (
          <button
            type="button"
            aria-label={t('chooseFile')}
            className={cn(
              'flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition-colors',
              'hover:border-primary/60 hover:bg-primary/5 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              isDragging && 'border-primary bg-primary/5'
            )}
            onClick={() => inputRef.current?.click()}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            disabled={upload.isPending}
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              {upload.isPending ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <UploadCloud className="size-5" />
              )}
            </span>
            <span className="mt-3 font-medium text-sm">
              {upload.isPending ? t('uploading') : t('dropFiles')}
            </span>
            <span className="mt-1 text-muted-foreground text-xs">
              {t('browseFiles')}
            </span>
          </button>
        ) : null}

        {draftSubmission?.files.length ? (
          <SubmissionFileList
            files={draftSubmission.files}
            label={t('draftFiles')}
            removingFileId={removingFileId}
            removeDisabled={
              upload.isPending || submit.isPending || removeFile.isPending
            }
            onRemove={async (fileId) => {
              await removeFile.mutateAsync(fileId);
            }}
          />
        ) : null}

        {submission?.files.length ? (
          <SubmissionFileList
            files={submission.files}
            label={
              draftSubmission ? t('latestSubmissionFiles') : t('uploadedFiles')
            }
          />
        ) : null}

        {!draftSubmission?.files.length &&
        !submission?.files.length &&
        !canUpload ? (
          <div className="rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
            {t('noFiles')}
          </div>
        ) : null}

        {submission?.status === 'GRADED' ? (
          <div className="rounded-xl bg-primary/5 p-4 ring-1 ring-primary/15">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="size-4" />
              <p className="font-semibold text-sm">{t('graded')}</p>
            </div>
            <p className="mt-3 font-bold text-2xl tabular-nums">
              {submission.score} / {assignment.maxPoints}
            </p>
            {submission.feedback ? (
              <div className="mt-3 border-t pt-3">
                <p className="font-medium text-xs uppercase tracking-wide">
                  {t('feedback')}
                </p>
                <p className="mt-1 text-muted-foreground text-sm leading-6">
                  {submission.feedback}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {isPastDue && (!submission || draftSubmission) ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground text-sm">
            {t('deadlinePassed')}
          </p>
        ) : null}

        {draftSubmission ? (
          <Button
            size="lg"
            className="w-full"
            onClick={() => submit.mutate()}
            disabled={!canSubmit || submit.isPending}
          >
            <Send data-icon="inline-start" />
            {submit.isPending ? t('submitting') : t('submit')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function SubmissionStatus({
  status,
}: {
  status: 'DRAFT' | 'SUBMITTED' | 'GRADED';
}) {
  const t = useTranslations('Courses.AssignmentStudent');
  const label = {
    DRAFT: t('statusDraft'),
    SUBMITTED: t('statusSubmitted'),
    GRADED: t('statusGraded'),
  }[status];

  return (
    <Badge variant={status === 'DRAFT' ? 'secondary' : 'default'}>
      {label}
    </Badge>
  );
}
