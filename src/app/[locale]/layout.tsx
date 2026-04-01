import { Inter, Lexend } from 'next/font/google';
import '../globals.css';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import LanguageSwitcher from '@/components/client/LanguageSwitcher';
import { Link } from '@/i18n/navigation';
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
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${lexend.variable} font-sans antialiased`}
      >
        <Providers>
          <header className="flex items-center justify-between gap-4 border-b px-4 py-4">
            <nav className="flex items-center gap-4 font-medium text-sm">
              <Link
                href="/"
                className="transition-colors hover:text-foreground/80"
              >
                Home
              </Link>
              <Link
                href="/about"
                className="transition-colors hover:text-foreground/80"
              >
                About
              </Link>
              <Link
                href="/login"
                className="transition-colors hover:text-foreground/80"
              >
                Login
              </Link>
            </nav>
            <LanguageSwitcher />
          </header>
          <main>{children}</main>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
