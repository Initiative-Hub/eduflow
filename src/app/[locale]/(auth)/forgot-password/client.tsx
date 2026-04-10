'use client';

import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type FormFieldConfig, FormTemplate } from '@/components/custom/form';
import { useTranslatedFields } from '@/hooks/use-translated-fields';
import {
  forgotPasswordDefaultValues,
  forgotPasswordSchema,
} from './forgot-password.config';
import { useForgotPassword } from './use-forgot-password';

type ForgotPasswordClientProps = {
  fields: FormFieldConfig[];
};

export function ForgotPasswordClient({ fields }: ForgotPasswordClientProps) {
  const t = useTranslations('AuthForgotPassword');
  const translatedFields = useTranslatedFields(fields, 'AuthForgotPassword');

  const { handleSubmit, submittedEmail, isLoading } = useForgotPassword();

  return (
    <div className="w-full space-y-6">
      <FormTemplate
        schema={forgotPasswordSchema}
        defaultValues={forgotPasswordDefaultValues}
        fields={translatedFields}
        onSubmit={handleSubmit}
        submitLabel={isLoading ? t('actions.sending') : t('actions.send')}
        isLoading={isLoading}
        className="gap-5"
      />

      {submittedEmail ? (
        <div className="rounded-3xl border border-primary/15 bg-primary/5 px-4 py-4 text-foreground text-sm shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">{t('success.title')}</p>
              <p className="text-muted-foreground leading-relaxed">
                {t('success.description', { email: submittedEmail })}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 font-semibold text-primary text-sm hover:underline"
        >
          <ArrowLeft className="size-4" />
          {t('actions.backToLogin')}
        </Link>
      </div>
    </div>
  );
}
