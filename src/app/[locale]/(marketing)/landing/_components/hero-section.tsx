import { ArrowDown, ArrowRight, Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { LearningRail } from './learning-rail';
import { Reveal } from './reveal';

export async function HeroSection() {
  const t = await getTranslations('LandingPage.hero');

  return (
    <section className="relative isolate overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:px-8 lg:pb-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(circle_at_25%_15%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_34%),radial-gradient(circle_at_85%_40%,color-mix(in_oklch,var(--secondary)_13%,transparent),transparent_30%)]" />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col items-start gap-7 lg:col-span-5">
          <Reveal>
            <Badge variant="secondary">{t('eyebrow')}</Badge>
          </Reveal>
          <Reveal delay={0.08} className="flex flex-col gap-5">
            <h1 className="text-balance font-heading font-semibold text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              {t('title')}
            </h1>
            <p className="max-w-xl text-pretty text-lg text-muted-foreground leading-8 sm:text-xl">
              {t('description')}
            </p>
          </Reveal>
          <Reveal
            delay={0.16}
            className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
          >
            <Button asChild size="lg" className="min-h-11 px-5">
              <Link href="/register">
                {t('primaryCta')}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-11 px-5"
            >
              <Link href="/landing#how-it-works">
                {t('secondaryCta')}
                <ArrowDown
                  data-icon="inline-end"
                  data-motion-direction="down"
                />
              </Link>
            </Button>
          </Reveal>
          <Reveal delay={0.24}>
            <ul className="grid gap-3 text-muted-foreground text-sm sm:grid-cols-2">
              {(['teacherControl', 'bilingual', 'sourceGrounded'] as const).map(
                (key) => (
                  <li key={key} className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    {t(`proof.${key}`)}
                  </li>
                )
              )}
            </ul>
          </Reveal>
        </div>

        <div className="lg:col-span-7 lg:pl-6">
          <LearningRail
            ariaLabel={t('rail.ariaLabel')}
            nodes={{
              assessment: {
                description: t('rail.assessment.description'),
                label: t('rail.assessment.label'),
              },
              lesson: {
                description: t('rail.lesson.description'),
                label: t('rail.lesson.label'),
              },
              source: {
                description: t('rail.source.description'),
                label: t('rail.source.label'),
              },
              tutor: {
                description: t('rail.tutor.description'),
                label: t('rail.tutor.label'),
              },
            }}
          />
        </div>
      </div>
    </section>
  );
}
