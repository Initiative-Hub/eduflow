'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';

type RemoveSubmissionFileDialogProps = {
  disabled?: boolean;
  fileName: string;
  isPending: boolean;
  onRemove: () => Promise<void>;
};

export function RemoveSubmissionFileDialog({
  disabled = false,
  fileName,
  isPending,
  onRemove,
}: RemoveSubmissionFileDialogProps) {
  const t = useTranslations('Courses.AssignmentStudent');

  return (
    <ConfirmDialog
      destructive
      cancelLabel={t('cancelRemove')}
      confirmIcon={<Trash2 data-icon="inline-start" />}
      confirmLabel={t('removeFileConfirm')}
      description={t('removeFileDescription', {
        name: fileName,
      })}
      icon={<Trash2 />}
      isPending={isPending}
      pendingLabel={t('removingFile')}
      title={t('removeFileTitle')}
      onConfirm={({ close }) => {
        void onRemove()
          .then(close)
          .catch(() => undefined);
      }}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label={t('removeFile', {
            name: fileName,
          })}
        >
          <Trash2 />
        </Button>
      }
    />
  );
}
