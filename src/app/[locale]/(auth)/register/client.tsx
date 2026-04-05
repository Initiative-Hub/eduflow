'use client';

import { useTranslations } from 'next-intl';
import { type FormFieldConfig, FormTemplate } from '@/components/custom/form';
import { useTranslatedFields } from '@/hooks/use-translated-fields';
import { registerDefaultValues, registerSchema } from './register.config';
import { useRegister } from './use-register';

type RegisterClientProps = {
  fields: FormFieldConfig[];
};

export function RegisterClient({ fields }: RegisterClientProps) {
  const t = useTranslations('AuthRegister');
  const translatedFields = useTranslatedFields(fields, 'AuthRegister');

  const { error, isLoading, handleSubmit } = useRegister();

  return (
    <FormTemplate
      schema={registerSchema}
      defaultValues={registerDefaultValues}
      fields={translatedFields}
      onSubmit={handleSubmit}
      submitLabel={
        isLoading ? t('actions.creatingAccount') : t('actions.createAccount')
      }
      isLoading={isLoading}
    >
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </FormTemplate>
  );
}
