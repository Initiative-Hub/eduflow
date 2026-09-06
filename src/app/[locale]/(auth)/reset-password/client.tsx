'use client';

import { ArrowLeft, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type FormFieldConfig, FormTemplate } from '@/components/custom/form';
import { useTranslatedFields } from '@/hooks/use-translated-fields';
import {
  resetPasswordDefaultValues,
  resetPasswordSchema,
} from './reset-password.config';
import { useResetPassword } from './use-reset-password';

type ResetPasswordClientProps = {
  token: string;
  fields: FormFieldConfig[];
};

export function ResetPasswordClient({
  token,
  fields,
}: ResetPasswordClientProps) {
  const t = useTranslations('AuthResetPassword');
  const translatedFields = useTranslatedFields(fields, 'AuthResetPassword');

  const { handleSubmit, isLoading, isSuccess } = useResetPassword(token);

  return (
    <div className="w-full space-y-6">
      {!isSuccess ? (
        <FormTemplate
          schema={resetPasswordSchema}
          defaultValues={resetPasswordDefaultValues}
          fields={translatedFields}
          onSubmit={handleSubmit}
          submitLabel={isLoading ? t('actions.resetting') : t('actions.reset')}
          isLoading={isLoading}
          className="gap-5"
        />
      ) : (
        <div className="rounded-3xl border border-primary/15 bg-primary/5 px-4 py-4 text-foreground text-sm shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">{t('success.title')}</p>
              <p className="text-muted-foreground leading-relaxed">
                {t('success.description')}
              </p>
            </div>
          </div>
        </div>
      )}

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
