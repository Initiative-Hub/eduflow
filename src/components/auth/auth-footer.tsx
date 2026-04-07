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
    <footer className="relative z-10 w-full border-border/50 border-t bg-background/80 px-6 py-4 backdrop-blur-sm sm:py-12 md:px-10">
      <div className="mx-auto flex flex-col items-center gap-8 px-2 sm:flex-row sm:justify-between sm:gap-0">
        <span className="font-black text-foreground text-xl">{t('brand')}</span>

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
