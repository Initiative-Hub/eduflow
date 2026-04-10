'use client';

import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormFieldConfig, FormTemplate } from '@/components/custom/form';
import { Button } from '@/components/ui/button';
import { DEV_MODE } from '@/constants/common';
import { useTranslatedFields } from '@/hooks/use-translated-fields';
import { useVerifyOtp } from './use-verify-otp';
import { verifyOtpDefaultValues, verifyOtpSchema } from './verify-otp.config';

type VerifyOtpClientProps = {
  email: string;
  fields: FormFieldConfig[];
};

export function VerifyOtpClient({ email, fields }: VerifyOtpClientProps) {
  const t = useTranslations('AuthVerifyOtp');
  const translatedFields = useTranslatedFields(fields, 'AuthVerifyOtp');

  const {
    error,
    isVerifying,
    isResending,
    cooldownSeconds,
    handleVerify,
    handleResend,
    openMailpit,
  } = useVerifyOtp();

  return (
    <div className="w-full space-y-5">
      <FormTemplate
        schema={verifyOtpSchema}
        defaultValues={verifyOtpDefaultValues}
        fields={translatedFields}
        onSubmit={(values) =>
          handleVerify({
            email,
            otp: values.otp,
          })
        }
        submitLabel={isVerifying ? t('actions.verifying') : t('actions.verify')}
        isLoading={isVerifying}
        className="gap-5"
      >
        {error && <p className="text-destructive text-sm">{error}</p>}

        {DEV_MODE && (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full"
            onClick={openMailpit}
          >
            <Mail size={18} className="mr-1" />
            {t('actions.openMailpit')}
          </Button>
        )}

        <div className="flex items-center justify-center gap-1 text-sm">
          <span className="text-muted-foreground">{t('resend.action')}</span>
          <Button
            type="button"
            variant="ghost"
            className="h-auto p-0 font-semibold text-primary hover:bg-transparent hover:text-primary"
            onClick={() => handleResend(email)}
            disabled={isResending || cooldownSeconds > 0 || isVerifying}
          >
            {cooldownSeconds > 0
              ? t('resend.cooldown', {
                  seconds: cooldownSeconds,
                })
              : isResending
                ? t('resend.loading')
                : t('resend.action')}
          </Button>
        </div>
      </FormTemplate>
    </div>
  );
}
