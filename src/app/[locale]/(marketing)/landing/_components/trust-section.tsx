import { Languages, PencilRuler, ScanSearch } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const trustItems = [
  { icon: PencilRuler, key: 'editable' },
  { icon: ScanSearch, key: 'grounded' },
  { icon: Languages, key: 'bilingual' },
] as const;

export async function TrustSection() {
  const t = await getTranslations('LandingPage.trust');

  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto grid w-full max-w-7xl overflow-hidden rounded-3xl bg-primary text-primary-foreground lg:grid-cols-12">
        <div className="flex flex-col gap-4 px-6 py-10 sm:px-10 lg:col-span-5 lg:justify-center lg:px-12 lg:py-16">
          <p className="font-semibold text-primary-foreground/75 text-sm uppercase tracking-[0.18em]">
            {t('eyebrow')}
          </p>
          <h2 className="text-balance font-heading font-semibold text-3xl tracking-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="text-pretty text-primary-foreground/80 leading-7">
            {t('description')}
          </p>
        </div>
        <div className="grid bg-background/10 sm:grid-cols-3 lg:col-span-7">
          {trustItems.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex flex-col gap-4 border-primary-foreground/15 border-t p-6 sm:border-t-0 sm:border-l lg:p-8"
            >
              <Icon className="size-6" aria-hidden="true" />
              <div className="flex flex-col gap-2">
                <h3 className="font-heading font-semibold">
                  {t(`${key}.title`)}
                </h3>
                <p className="text-primary-foreground/75 text-sm leading-6">
                  {t(`${key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
