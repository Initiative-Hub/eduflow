import { GraduationCap, Presentation } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from './reveal';

export async function AudienceSection() {
  const t = await getTranslations('LandingPage.audience');

  const audiences = [
    { icon: Presentation, key: 'educators' },
    { icon: GraduationCap, key: 'learners' },
  ] as const;

  return (
    <section className="px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-4 md:grid-cols-2">
        {audiences.map(({ icon: Icon, key }, index) => (
          <Reveal key={key} delay={index * 0.08}>
            <Card className="h-full min-h-48">
              <CardHeader>
                <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <CardTitle>
                  <h2 className="text-xl">{t(`${key}.title`)}</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="max-w-xl text-base text-muted-foreground leading-7">
                  {t(`${key}.description`)}
                </p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
