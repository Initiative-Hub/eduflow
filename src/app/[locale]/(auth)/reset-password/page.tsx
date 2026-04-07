import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AuthFormHeading } from '@/components/auth';
import { validateResetPasswordToken } from '@/lib/token-validation';
import { ResetPasswordClient } from './client';
import { resetPasswordFields } from './reset-password.config';

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Reset Password',
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const [{ token }, t] = await Promise.all([
    searchParams,
    getTranslations('AuthResetPassword'),
  ]);

  if (!token) {
    return <InvalidTokenState t={t} />;
  }

  const validationResult = await validateResetPasswordToken(token);

  if (!validationResult.isValid) {
    return <InvalidTokenState t={t} />;
  }

  return (
    <div className="space-y-6">
      <AuthFormHeading title={t('title')} description={t('description')} />

      <ResetPasswordClient token={token} fields={resetPasswordFields} />
    </div>
  );
}

function InvalidTokenState({
  t,
}: {
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <div className="space-y-6 text-center">
      <AuthFormHeading
        title={t('invalidToken.title')}
        description={t('invalidToken.description')}
      />
      <Link
        href="/forgot-password"
        className="inline-flex items-center gap-2 font-semibold text-primary text-sm hover:underline"
      >
        <ArrowLeft className="size-4" />
        {t('actions.backToForgot')}
      </Link>
    </div>
  );
}
