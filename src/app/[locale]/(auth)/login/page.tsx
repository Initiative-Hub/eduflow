'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AuthFormHeading } from '@/components/auth/auth-form-heading';
import { AuthSocialOptions } from '@/components/auth/auth-social-options';
import { FormTemplate } from '@/components/custom/form';
import { useTranslatedFields } from '@/hooks/use-translated-fields';
import { loginDefaultValues, loginFields, loginSchema } from './login.config';
import { useLogin } from './use-login';

export default function LoginPage() {
  const t = useTranslations('AuthLogin');
  const translatedFields = useTranslatedFields(loginFields, 'AuthLogin');

  const { error, isLoading, handleSubmit } = useLogin();

  return (
    <div className="space-y-6">
      <AuthFormHeading title={t('title')} description={t('description')} />
      <div className="w-full space-y-6">
        <FormTemplate
          schema={loginSchema}
          defaultValues={loginDefaultValues}
          fields={translatedFields}
          onSubmit={handleSubmit}
          submitLabel={isLoading ? t('actions.signingIn') : t('actions.signIn')}
          isLoading={isLoading}
        >
          <div className="flex items-start justify-between gap-3">
            {error && (
              <p className="wrap-break-word min-w-0 flex-1 text-red-600 text-sm">
                {error}
              </p>
            )}

            <div className="shrink-0 whitespace-nowrap text-right">
              <Link
                href="/forgot-password"
                className="text-primary text-sm hover:underline"
              >
                {t('actions.forgotPassword')}
              </Link>
            </div>
          </div>
        </FormTemplate>
      </div>
      <AuthSocialOptions />
    </div>
  );
}
