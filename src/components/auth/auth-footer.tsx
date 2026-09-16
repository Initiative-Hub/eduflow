import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function AuthFooter() {
  const t = await getTranslations('AuthFooter');

  const footerLinks = [
    { key: 'privacyPolicy', href: '/privacy' },
    { key: 'termsOfService', href: '/terms' },
    { key: 'helpCenter', href: '/help' },
    { key: 'cookieSettings', href: '/cookies' },
  ] as const;

  return (
    <footer className="relative border-border/50 border-t bg-background/80 px-6 py-4 backdrop-blur-sm md:px-10 md:py-12">
      <div className="mx-auto flex flex-col items-center gap-6 px-2 md:flex-row md:justify-between md:gap-0">
        <Link href="/landing">
          <div className="h-6">
            <Image
              className="h-full w-auto"
              src="/branding.png"
              alt="EduFlow logo"
              width={250}
              height={50}
              priority
            />
          </div>
        </Link>

        <nav aria-label="Footer navigation">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            {footerLinks.map(({ key, href }) => (
              <li key={key}>
                <a
                  href={href}
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                >
                  {t(key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-muted-foreground text-sm">{t('copyright')}</p>
      </div>
    </footer>
  );
}
