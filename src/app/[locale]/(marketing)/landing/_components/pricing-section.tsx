import { ArrowRight, Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { SectionHeading } from './section-heading';

const planKeys = ['starter', 'educator', 'school'] as const;

export async function PricingSection() {
  const t = await getTranslations('LandingPage.pricing');

  return (
    <section
      id="pricing"
      className="scroll-mt-24 bg-muted/40 px-4 py-24 sm:px-6 lg:px-8 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          align="center"
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
        />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {planKeys.map((key) => {
            const isStarter = key === 'starter';
            const featureKeys = ['feature1', 'feature2', 'feature3'] as const;

            return (
              <Card key={key} className="min-h-full">
                <CardHeader>
                  <CardTitle>
                    <h3 className="text-xl">{t(`${key}.name`)}</h3>
                  </CardTitle>
                  {key === 'educator' && (
                    <CardAction>
                      <Badge>{t('recommended')}</Badge>
                    </CardAction>
                  )}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <p className="font-heading font-semibold text-3xl">
                      {t(`${key}.price`)}
                    </p>
                    <p className="text-muted-foreground text-sm leading-6">
                      {t(`${key}.description`)}
                    </p>
                  </div>
                  <ul className="flex flex-col gap-3">
                    {featureKeys.map((featureKey) => (
                      <li
                        key={featureKey}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="size-3" aria-hidden="true" />
                        </span>
                        <span>{t(`${key}.${featureKey}`)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    variant={isStarter ? 'default' : 'outline'}
                    className="w-full"
                  >
                    <Link href={isStarter ? '/register' : '/landing#contact'}>
                      {t(`${key}.cta`)}
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground text-sm">
          {t('note')}
        </p>
      </div>
    </section>
  );
}
