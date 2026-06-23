import { Inter, Lexend } from 'next/font/google';
import '../globals.css';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { SpeedInsights as VercelInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import Locator from '@/components/locator';
import ReactScan from '@/components/react-scan';
import { DEV_MODE, PROD_MODE } from '@/constants/common';
import { routing } from '@/i18n/routing';
import Providers from '@/providers/providers';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const lexend = Lexend({
  variable: '--font-lexend',
  subsets: ['latin'],
});

interface RootLayoutProps {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'EduFlow',
    template: '%s | EduFlow',
  },
  applicationName: 'EduFlow',
  description:
    'EduFlow is an AI-powered learning workspace for Socratic tutoring, writing support, and language practice in one focused flow.',
  keywords: [
    'EduFlow',
    'AI study assistant',
    'Socratic tutor',
    'writing assistant',
    'English learning assistant',
    'student productivity',
    'study workspace',
  ],
  openGraph: {
    title: 'EduFlow',
    description:
      'Learn faster with AI-guided conversations, clear writing support, and personalized tools built for daily study.',
    type: 'website',
    images: [
      {
        url: '/dashboard.png',
        width: 1200,
        height: 630,
        alt: 'EduFlow dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EduFlow',
    description:
      'Learn faster with AI-guided conversations, clear writing support, and personalized tools built for daily study.',
    images: ['/dashboard.png'],
  },
  icons: {
    icon: '/branding.png',
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${lexend.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        {DEV_MODE && <Locator />}
        {DEV_MODE && <ReactScan />}
        {PROD_MODE && <VercelAnalytics />}
        {PROD_MODE && <VercelInsights />}
      </body>
    </html>
  );
}
