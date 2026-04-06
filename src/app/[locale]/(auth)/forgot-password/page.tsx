import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthFormHeading } from '@/components/auth/auth-form-heading';
import { ForgotPasswordClient } from './client';
import { forgotPasswordFields } from './forgot-password.config';

export const metadata: Metadata = {
  title: 'Forgot Password',
};

export default async function ForgotPasswordPage() {
  const t = await getTranslations('AuthForgotPassword');

  return (
    <div className="space-y-6">
      <AuthFormHeading title={t('title')} description={t('description')} />

      <ForgotPasswordClient fields={forgotPasswordFields} />
    </div>
  );
}
