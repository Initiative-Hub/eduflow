import { Mail } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { VerifyOtpClient } from './client';
import { verifyOtpFields } from './verify-otp.config';

type VerifyOtpPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export const metadata = {
  title: 'Email Verification',
};

export default async function VerifyOtpPage({
  searchParams,
}: VerifyOtpPageProps) {
  const [{ email: rawEmail }, t] = await Promise.all([
    searchParams,
    getTranslations('AuthVerifyOtp'),
  ]);
  const email = rawEmail ? decodeURIComponent(rawEmail) : '';

  if (!email) {
    redirect('/register');
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
          <span className="font-semibold text-primary">{email}</span>
        </p>
      </div>

      <VerifyOtpClient email={email} fields={verifyOtpFields} />
    </div>
  );
}
