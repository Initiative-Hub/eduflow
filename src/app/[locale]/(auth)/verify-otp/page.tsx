'use client';

import { Mail } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect } from 'react';
import { FormTemplate } from '@/components/custom/form';
import { Button } from '@/components/ui/button';
import { useTranslatedFields } from '@/hooks/use-translated-fields';
import { useVerifyOtp } from './use-verify-otp';
import {
  verifyOtpDefaultValues,
  verifyOtpFields,
  verifyOtpSchema,
} from './verify-otp.config';

function VerifyOtpContent() {
  const t = useTranslations('AuthVerifyOtp');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Safely grab the email and decode it just in case the URL encoded the '@' symbol
  const rawEmail = searchParams.get('email');
  const initialEmail = rawEmail ? decodeURIComponent(rawEmail) : '';

  const translatedFields = useTranslatedFields(
    verifyOtpFields,
    'AuthVerifyOtp'
  );

  const {
    error,
    isVerifying,
    isResending,
    cooldownSeconds,
    handleVerify,
    handleResend,
  } = useVerifyOtp();

  // Route Protection: If there is no email in the URL, kick them back to register
  useEffect(() => {
    if (!initialEmail) {
      router.replace('/register');
    }
  }, [initialEmail, router]);

  // Prevent flashing the UI while the redirect is happening
  if (!initialEmail) {
    return null;
  }

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Mail className="size-8" />
      </div>
      <div className="space-y-2">
        <h2 className="font-extrabold text-4xl text-foreground leading-none tracking-tight">
          {t('title')}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t('description')}{' '}
          <span className="font-semibold text-primary">{initialEmail}</span>
        </p>
      </div>

      <div className="w-full space-y-5">
        <FormTemplate
          schema={verifyOtpSchema}
          defaultValues={verifyOtpDefaultValues}
          fields={translatedFields}
          onSubmit={(values) =>
            handleVerify({
              email: initialEmail,
              otp: values.otp,
            })
          }
          submitLabel={
            isVerifying ? t('actions.verifying') : t('actions.verify')
          }
          isLoading={isVerifying}
          className="gap-5"
        >
          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex items-center justify-center gap-1 text-sm">
            <span className="text-muted-foreground">{t('resend.label')}</span>
            <Button
              type="button"
              variant="ghost"
              className="h-auto p-0 font-semibold text-primary hover:bg-transparent hover:text-primary"
              onClick={() => handleResend(initialEmail)}
              disabled={isResending || cooldownSeconds > 0 || isVerifying}
            >
              {cooldownSeconds > 0
                ? t('resend.cooldown', { seconds: cooldownSeconds })
                : isResending
                  ? t('resend.loading')
                  : t('resend.action')}
            </Button>
          </div>
        </FormTemplate>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpContent />
    </Suspense>
  );
}
