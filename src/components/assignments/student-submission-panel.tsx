'use client';

import {
  CheckCircle2,
  Download,
  FileText,
  LoaderCircle,
  Send,
  UploadCloud,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';
import type { Assignment } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import { assignmentService } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import { useAssignmentSubmission } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/use-assignment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function StudentSubmissionPanel({
  assignment,
}: {
  assignment: Assignment;
}) {
  const t = useTranslations('Courses.AssignmentStudent');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { upload, submit } = useAssignmentSubmission(assignment.id);

  const submission = assignment.submission;
  const isPastDue = assignment.dueAt
    ? new Date(assignment.dueAt).getTime() < Date.now()
    : false;

  const canUpload = !isPastDue;

  const canSubmit =
    submission?.status === 'DRAFT' && submission.files.length > 0 && !isPastDue;

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

        {!isPastDue && submission && status !== 'DRAFT' ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground text-sm">
            {t('resubmitDescription')}
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

        {submission?.files.length ? (
          <div className="space-y-2">
            <p className="font-medium text-sm">{t('uploadedFiles')}</p>
            {submission.files.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
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
          !canUpload && (
            <div className="rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              {t('noFiles')}
            </div>
          )
        )}

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

        {isPastDue && status === 'DRAFT' ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground text-sm">
            {t('deadlinePassed')}
          </p>
        ) : null}

        {status === 'DRAFT' ? (
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

function formatFileSize(bytes: number | null) {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
