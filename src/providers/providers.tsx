import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import ClientProviders from './client-providers';

export default async function Providers({ children }: { children: ReactNode }) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider
        attribute="class"
        themes={['system', 'light', 'dark']}
        defaultTheme="light"
        enableSystem
      >
        <ClientProviders>{children}</ClientProviders>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
