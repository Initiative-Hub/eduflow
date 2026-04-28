import { useTranslations } from 'next-intl';
import { DialogTemplate } from '@/components/custom/dialog/dialog';
import { FormTemplate } from '@/components/custom/form';
import {
  type CreateModuleFormData,
  createModuleDefaultValues,
  createModuleSchema,
  moduleFields,
} from '../create-module.config';

interface AddModuleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateModuleFormData) => void;
  isLoading: boolean;
}

export function AddModuleDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  isLoading,
}: AddModuleDialogProps) {
  const t = useTranslations('Courses.AddModuleDialog');

  const translatedFields = moduleFields.map((field) => ({
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
        schema={createModuleSchema}
        defaultValues={createModuleDefaultValues}
        fields={translatedFields}
        onSubmit={onSubmit}
        submitLabel={t('submit')}
        isLoading={isLoading}
      />
    </DialogTemplate>
  );
}
