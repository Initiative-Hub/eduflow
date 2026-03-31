'use client';

import { Inter, Lexend } from 'next/font/google';
import Link from 'next/link';
import '../globals.css';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
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

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body
        className={`${inter.variable} ${lexend.variable} font-sans antialiased`}
      >
        <Providers>
          <header
            style={{ padding: '1rem', borderBottom: '1px solid #eaeaea' }}
          >
            <nav style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/">Home</Link>
              <Link href="/about">About</Link>
              <Link
                href="/login"
                style={{
                  cursor: 'pointer',
                  color: 'blue',
                  textDecoration: 'underline',
                }}
              >
                Login
              </Link>
            </nav>
          </header>
          <main>{children}</main>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
