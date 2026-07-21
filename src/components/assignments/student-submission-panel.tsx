'use client';

import { Download, Send, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import type { Assignment } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import { assignmentService } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import { useAssignmentSubmission } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/use-assignment';
import { Button } from '@/components/ui/button';

export function StudentSubmissionPanel({
  assignment,
}: {
  assignment: Assignment;
}) {
  const t = useTranslations('Courses.AssignmentStudent');
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, submit } = useAssignmentSubmission(assignment.id);

  const submission = assignment.submission;
  const canSubmit = submission?.status === 'DRAFT';

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await upload.mutateAsync(file);
    event.target.value = '';
  };

  return (
    <section className="mt-8 rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">{t('title')}</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {t('description')}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={!canSubmit || upload.isPending}
        >
          <Upload data-icon="inline-start" />
          {t('chooseFile')}
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        {submission?.files.map((entry) => (
          <a
            key={entry.id}
            href={assignmentService.fileDownloadUrl(entry.file.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted"
          >
            <Download className="size-4" />
            {entry.file.name}
          </a>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={() => submit.mutate()}
          disabled={!canSubmit || submit.isPending || !submission?.files.length}
        >
          <Send data-icon="inline-start" />
          {t('submit')}
        </Button>
      </div>

      {submission?.status === 'GRADED' ? (
        <div className="mt-6 rounded-lg bg-muted p-4">
          <p className="font-medium">
            {t('score')}: {submission.score} / {assignment.maxPoints}
          </p>
          {submission.feedback ? (
            <p className="mt-2 text-muted-foreground text-sm">
              {submission.feedback}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
