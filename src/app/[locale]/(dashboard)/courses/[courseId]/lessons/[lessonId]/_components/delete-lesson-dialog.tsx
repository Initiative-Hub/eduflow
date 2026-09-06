'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { useDeleteLesson } from '../use-lesson';

interface DeleteLessonDialogProps {
  courseId: string;
  lessonId: string;
  compact?: boolean;
  navigateAfterDelete?: boolean;
}

const DeleteLessonDialog = ({
  courseId,
  lessonId,
  compact = false,
  navigateAfterDelete = true,
}: DeleteLessonDialogProps) => {
  const t = useTranslations('Courses.LessonHeader');
  const router = useRouter();
  const { isDeletingLesson, handleDeleteLesson } = useDeleteLesson(courseId);

  return (
    <ConfirmDialog
      cancelLabel={t('deleteDialog.cancel')}
      confirmIcon={<Trash2 data-icon="inline-start" />}
      confirmLabel={t('deleteDialog.confirm')}
      description={t('deleteDialog.description')}
      destructive
      icon={<Trash2 />}
      isPending={isDeletingLesson}
      onConfirm={({ close }) => {
        handleDeleteLesson(lessonId, {
          onSuccess: () => {
            close();
            if (navigateAfterDelete) {
              router.push(`/courses/${courseId}`);
            }
          },
        });
      }}
      pendingLabel={t('deleteDialog.deleting')}
      title={t('deleteDialog.title')}
      trigger={
        <Button
          type="button"
          variant="destructive"
          size={compact ? 'icon-sm' : 'sm'}
          title={compact ? t('delete') : undefined}
          className="cursor-pointer"
        >
          <Trash2
            aria-hidden="true"
            data-icon={compact ? undefined : 'inline-start'}
          />
          {compact ? (
            <span className="sr-only">{t('delete')}</span>
          ) : (
            t('delete')
          )}
        </Button>
      }
    />
  );
};

export default DeleteLessonDialog;
