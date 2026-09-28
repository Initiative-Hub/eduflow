import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { GuestControls } from '@/components/layout/navbar-avatar/guest-controls';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { MarketingMobileNavigation } from './marketing-mobile-navigation';

const navigationItems = [
  { href: '/landing#how-it-works', key: 'howItWorks' },
  { href: '/landing#features', key: 'features' },
  { href: '/landing#pricing', key: 'pricing' },
  { href: '/landing#faq', key: 'faq' },
  { href: '/landing#contact', key: 'contact' },
] as const;

export async function MarketingHeader() {
  const t = await getTranslations('MarketingLayout');
  const mobileItems = navigationItems.map(({ href, key }) => ({
    href,
    label: t(`nav.${key}`),
  }));

  return (
    <header className="sticky top-0 z-40 border-border/70 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/landing"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('homeLabel')}
        >
          <Image
            src="/branding.png"
            alt="EduFlow"
            width={632}
            height={148}
            className="h-7 w-auto"
            priority
          />
        </Link>

        <nav aria-label={t('navLabel')} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navigationItems.map(({ href, key }) => (
              <li key={key}>
                <Button asChild variant="ghost">
                  <Link href={href}>{t(`nav.${key}`)}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <GuestControls />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">{t('login')}</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/register">
              {t('startFree')}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <MarketingMobileNavigation
            items={mobileItems}
            labels={{
              description: t('mobile.description'),
              login: t('login'),
              menu: t('mobile.menu'),
              startFree: t('startFree'),
              title: t('mobile.title'),
            }}
          />
        </div>
      </div>
    </header>
  );
}
