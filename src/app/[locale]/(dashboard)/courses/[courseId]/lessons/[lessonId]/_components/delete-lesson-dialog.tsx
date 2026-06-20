'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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
  const [open, setOpen] = useState(false);
  const { isDeletingLesson, handleDeleteLesson } = useDeleteLesson(courseId);

  const handleDelete = () => {
    handleDeleteLesson(lessonId, {
      onSuccess: () => {
        setOpen(false);
        if (navigateAfterDelete) {
          router.push(`/courses/${courseId}`);
        }
      },
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeletingLesson) {
          setOpen(nextOpen);
        }
      }}
    >
      <AlertDialogTrigger asChild>
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
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeletingLesson}
            className="cursor-pointer"
          >
            {t('deleteDialog.cancel')}
          </AlertDialogCancel>

          <AlertDialogAction
            variant="destructive"
            disabled={isDeletingLesson}
            onClick={(event) => {
              event.preventDefault();
              handleDelete();
            }}
            className="cursor-pointers"
          >
            {isDeletingLesson ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Trash2 data-icon="inline-start" />
            )}
            {isDeletingLesson
              ? t('deleteDialog.deleting')
              : t('deleteDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteLessonDialog;
