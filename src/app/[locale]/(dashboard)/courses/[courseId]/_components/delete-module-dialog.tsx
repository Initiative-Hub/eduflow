'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';
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
  const { deleteModule, isDeletingModule } = useDeleteModule(courseId);

  return (
    <ConfirmDialog
      cancelLabel={t('deleteDialog.cancel')}
      confirmIcon={<Trash2 data-icon="inline-start" />}
      confirmLabel={t('deleteDialog.confirm')}
      description={t('deleteDialog.description', {
        title: moduleTitle,
        count: lessonCount,
      })}
      destructive
      icon={<Trash2 />}
      isPending={isDeletingModule}
      onConfirm={({ close }) => {
        deleteModule(moduleId, { onSuccess: close });
      }}
      pendingLabel={t('deleteDialog.deleting')}
      title={t('deleteDialog.title')}
      trigger={
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
      }
    />
  );
}
