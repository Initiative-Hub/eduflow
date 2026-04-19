import { DialogTemplate } from '@/components/custom/dialog/dialog';
import { FormTemplate } from '@/components/custom/form';
import {
  createLessonSchema,
  createLessonDefaultValues,
  lessonFields,
  type CreateLessonFormData,
} from '../create-lesson.config';
import { useTranslations } from 'next-intl';

interface AddLessonDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateLessonFormData) => void;
  isLoading: boolean;
}

export function AddLessonDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  isLoading,
}: AddLessonDialogProps) {
  const t = useTranslations('Courses.AddLessonDialog');

  const translatedFields = lessonFields.map((field) => ({
    ...field,
    label: t(`fields.${field.name}`),
    placeholder: t(`fields.${field.name}Placeholder`),
  }));

  return (
    <DialogTemplate
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description')}
    >
      <FormTemplate
        schema={createLessonSchema}
        defaultValues={createLessonDefaultValues}
        fields={translatedFields}
        onSubmit={onSubmit}
        submitLabel={t('submit')}
        isLoading={isLoading}
      />
    </DialogTemplate>
  );
}
