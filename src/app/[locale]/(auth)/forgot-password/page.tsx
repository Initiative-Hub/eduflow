import { getTranslations } from 'next-intl/server';
import { AuthFormHeading } from '@/components/auth/auth-form-heading';
import { ForgotPasswordClient } from './client';
import { forgotPasswordFields } from './forgot-password.config';

export default async function ForgotPasswordPage() {
  const t = await getTranslations('AuthForgotPassword');

  return (
    <div className="space-y-6">
      <AuthFormHeading title={t('title')} description={t('description')} />

      <ForgotPasswordClient fields={forgotPasswordFields} />
    </div>
  );
}
