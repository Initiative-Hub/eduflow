import { useTranslations } from 'next-intl';
import { DialogTemplate } from '@/components/custom/dialog/dialog';
import { FormTemplate } from '@/components/custom/form';
import {
  type CreateCourseFormData,
  createCourseDefaultValues,
  createCourseFields,
  createCourseSchema,
} from './create-course.config';

interface CreateCourseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCourseFormData) => void;
  isLoading: boolean;
}

export function CreateCourseDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateCourseDialogProps) {
  const t = useTranslations('Courses.CreateDialog');

  const translatedFields = createCourseFields.map((field) => ({
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
        schema={createCourseSchema}
        defaultValues={createCourseDefaultValues}
        fields={translatedFields}
        onSubmit={onSubmit}
        submitLabel={t('submit')}
        isLoading={isLoading}
      />
    </DialogTemplate>
  );
}
