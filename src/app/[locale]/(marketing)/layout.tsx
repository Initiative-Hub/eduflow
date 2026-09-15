import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { MarketingFooter } from './_components/marketing-footer';
import { MarketingHeader } from './_components/marketing-header';

export default async function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('MarketingLayout');

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only top-4 left-4 rounded-lg bg-background px-4 py-2 font-medium text-foreground shadow-lg focus:not-sr-only focus:fixed focus:z-50 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('skipToContent')}
      </a>
      <MarketingHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
