import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthFormHeading, AuthSocialOptions } from '@/components/auth';
import { LoginClient } from './client';
import { loginFields } from './login.config';

export const metadata: Metadata = {
  title: 'Login',
};

export default async function LoginPage() {
  const t = await getTranslations('AuthLogin');

  return (
    <div className="space-y-6">
      <AuthFormHeading title={t('title')} description={t('description')} />
      <div className="w-full space-y-6">
        <LoginClient fields={loginFields} />
      </div>
      <AuthSocialOptions />
    </div>
  );
}
