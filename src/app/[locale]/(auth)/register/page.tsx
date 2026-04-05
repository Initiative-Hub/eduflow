'use client';

import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { AuthFormHeading } from '@/components/auth/auth-form-heading';
import { AuthSocialOptions } from '@/components/auth/auth-social-options';
import { FormTemplate } from '@/components/custom/form';
import { useTranslatedFields } from '@/hooks/use-translated-fields';
import {
  registerDefaultValues,
  registerFields,
  registerSchema,
} from './register.config';
import { useRegister } from './use-register';

function RegisterContent() {
  const t = useTranslations('AuthRegister');
  const translatedFields = useTranslatedFields(registerFields, 'AuthRegister');

  const { error, isLoading, handleSubmit } = useRegister();

  return (
    <div className="space-y-6">
      <AuthFormHeading title={t('title')} description={t('description')} />
      <div className="w-full space-y-6">
        <FormTemplate
          schema={registerSchema}
          defaultValues={registerDefaultValues}
          fields={translatedFields}
          onSubmit={handleSubmit}
          submitLabel={
            isLoading
              ? t('actions.creatingAccount')
              : t('actions.createAccount')
          }
          isLoading={isLoading}
        >
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </FormTemplate>

        <p className="px-6 text-center text-muted-foreground text-sm">
          {t('agreement.text')}
          <span className="cursor-pointer text-primary hover:underline">
            {t('agreement.tos')}
          </span>
          {t('agreement.and')}
          <span className="cursor-pointer text-primary hover:underline">
            {t('agreement.privacy')}
          </span>
        </p>
      </div>
      <AuthSocialOptions />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
