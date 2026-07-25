'use client';

import { Download, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AssignmentSubmission } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import { assignmentService } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/assignment.service';
import { Button } from '@/components/ui/button';

export function SubmissionFileList({
  files,
  label,
}: {
  files: AssignmentSubmission['files'];
  label: string;
}) {
  const t = useTranslations('Courses.AssignmentStudent');

  return (
    <div className="space-y-2">
      <p className="font-medium text-sm">{label}</p>
      {files.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{entry.file.name}</p>
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
  );
}

function formatFileSize(bytes: number | null) {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
