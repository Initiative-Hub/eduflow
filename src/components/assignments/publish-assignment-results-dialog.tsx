'use client';

import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePublishAssignmentResults } from '@/app/[locale]/(dashboard)/courses/[courseId]/assignments/use-assignment';
import { ConfirmDialog } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';

type PublishAssignmentResultsDialogProps = {
  assignmentId: string;
  courseId: string;
  gradedCount: number;
  hasPublishedResults: boolean;
};

export function PublishAssignmentResultDialog({
  assignmentId,
  courseId,
  gradedCount,
  hasPublishedResults,
}: PublishAssignmentResultsDialogProps) {
  const t = useTranslations('Courses.AssignmentTeacher');
  const publishMutation = usePublishAssignmentResults(courseId, assignmentId);

  const buttonLabel = hasPublishedResults
    ? t('publishUpdatedResults')
    : t('publishResults');

  return (
    <ConfirmDialog
      cancelLabel={t('cancelPublish')}
      confirmIcon={<Send data-icon="inline-start" />}
      confirmLabel={buttonLabel}
      description={t('publishResultsDescription', {
        count: gradedCount,
      })}
      icon={<Send />}
      isPending={publishMutation.isPending}
      pendingLabel={t('publishingResults')}
      title={t('publishResultsTitle')}
      onConfirm={({ close }) => {
        publishMutation.mutate(undefined, {
          onSuccess: close,
        });
      }}
      trigger={
        <Button
          type="button"
          size="sm"
          disabled={gradedCount === 0 || publishMutation.isPending}
        >
          <Send data-icon="inline-start" />
          {buttonLabel}
        </Button>
      }
    />
  );
}
