import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export async function CtaSection() {
  const t = await getTranslations('LandingPage.cta');

  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-7 rounded-3xl border bg-card px-6 py-14 text-center shadow-primary/10 shadow-xl sm:px-12 lg:py-20">
        <p className="font-semibold text-primary text-sm uppercase tracking-[0.18em]">
          {t('eyebrow')}
        </p>
        <h2 className="max-w-3xl text-balance font-heading font-semibold text-4xl tracking-tight sm:text-5xl">
          {t('title')}
        </h2>
        <p className="max-w-2xl text-pretty text-muted-foreground leading-7 sm:text-lg">
          {t('description')}
        </p>
        <Button asChild size="lg">
          <Link href="/register">
            {t('button')}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
