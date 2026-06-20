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
import { useDeleteModule } from '../use-modules';

interface DeleteModuleDialogProps {
  courseId: string;
  lessonCount: number;
  moduleId: string;
  moduleTitle: string;
}

export function DeleteModuleDialog({
  courseId,
  lessonCount,
  moduleId,
  moduleTitle,
}: DeleteModuleDialogProps) {
  const t = useTranslations('Courses.ModuleAccordion');
  const [open, setOpen] = useState(false);
  const { deleteModule, isDeletingModule } = useDeleteModule(courseId);

  const handleDelete = () => {
    deleteModule(moduleId, {
      onSuccess: () => {
        setOpen(false);
      },
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeletingModule) {
          setOpen(nextOpen);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          title={t('delete')}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Trash2 aria-hidden="true" />
          <span className="sr-only">{t('delete')}</span>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>

          <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>

          <AlertDialogDescription>
            {t('deleteDialog.description', {
              title: moduleTitle,
              count: lessonCount,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeletingModule}>
            {t('deleteDialog.cancel')}
          </AlertDialogCancel>

          <AlertDialogAction
            variant="destructive"
            disabled={isDeletingModule}
            onClick={(event) => {
              event.preventDefault();
              handleDelete();
            }}
          >
            {isDeletingModule ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Trash2 data-icon="inline-start" />
            )}

            {isDeletingModule
              ? t('deleteDialog.deleting')
              : t('deleteDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
