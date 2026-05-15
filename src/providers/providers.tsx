import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import ClientProviders from './client-providers';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider>
      <ThemeProvider
        attribute="class"
        themes={['system', 'light', 'dark']}
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <ClientProviders>{children}</ClientProviders>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
