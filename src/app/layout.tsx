'use client';

import { Inter, Lexend } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { Toaster } from 'sonner';
import Providers from '@/providers/providers';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const lexend = Lexend({
  variable: '--font-lexend',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
              <Link
                href="/register"
                style={{
                  cursor: 'pointer',
                  color: 'blue',
                  textDecoration: 'underline',
                }}
              >
                Register
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
