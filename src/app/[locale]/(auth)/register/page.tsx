import { getTranslations } from 'next-intl/server';
import { AuthFormHeading } from '@/components/auth/auth-form-heading';
import { AuthSocialOptions } from '@/components/auth/auth-social-options';
import { RegisterClient } from './client';
import { registerFields } from './register.config';

export default async function RegisterPage() {
  const t = await getTranslations('AuthRegister');

  return (
    <div className="space-y-6">
      <AuthFormHeading title={t('title')} description={t('description')} />
      <div className="w-full space-y-6">
        <RegisterClient fields={registerFields} />

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
