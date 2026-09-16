import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/i18n/navigation';

const exploreLinks = [
  { href: '/landing#how-it-works', key: 'howItWorks' },
  { href: '/landing#features', key: 'features' },
  { href: '/landing#pricing', key: 'pricing' },
  { href: '/landing#faq', key: 'faq' },
  { href: '/landing#contact', key: 'contact' },
] as const;

export async function MarketingFooter() {
  const t = await getTranslations('MarketingLayout');

  return (
    <footer className="bg-card">
      <Separator />
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-12 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-4 md:col-span-6 lg:col-span-7">
          <Link
            href="/landing"
            className="w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('homeLabel')}
          >
            <Image
              src="/branding.png"
              alt="EduFlow"
              width={632}
              height={148}
              className="h-8 w-auto"
            />
          </Link>
          <p className="max-w-md text-muted-foreground text-sm leading-6">
            {t('footer.description')}
          </p>
        </div>

        <nav aria-label={t('footer.exploreLabel')} className="md:col-span-3">
          <p className="mb-4 font-heading font-medium text-sm">
            {t('footer.explore')}
          </p>
          <ul className="flex flex-col gap-3">
            {exploreLinks.map(({ href, key }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t(`nav.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav
          aria-label={t('footer.accountLabel')}
          className="md:col-span-3 lg:col-span-2"
        >
          <p className="mb-4 font-heading font-medium text-sm">
            {t('footer.account')}
          </p>
          <ul className="flex flex-col gap-3">
            <li>
              <Link
                href="/login"
                className="text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t('login')}
              </Link>
            </li>
            <li>
              <Link
                href="/register"
                className="text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t('startFree')}
              </Link>
            </li>
            <li>
              <Link
                href="/api-docs"
                className="inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t('footer.apiDocs')}
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <Separator />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-muted-foreground text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        <p>{t('footer.tagline')}</p>
      </div>
    </footer>
  );
}
