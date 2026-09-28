import { ArrowRight, ArrowUpRight, CodeXml, GraduationCap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { Reveal } from './reveal';
import { SectionHeading } from './section-heading';

const showcaseUrl = 'https://www.rmitvn-showcase.com/relearn';
const repositoryUrl = 'https://github.com/Initiative-Hub/eduflow';

export async function ContactSection() {
  const t = await getTranslations('LandingPage.contact');

  return (
    <section
      id="contact"
      className="scroll-mt-24 bg-muted/40 px-4 py-24 sm:px-6 lg:px-8 lg:py-32"
    >
      <div className="mx-auto grid w-full max-w-7xl items-start gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
          />
          <Button asChild className="mt-7">
            <Link href="/register">
              {t('startFree')}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          <Reveal>
            <Card className="h-full">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GraduationCap className="size-5" aria-hidden="true" />
                </div>
                <CardTitle>
                  <h3>{t('showcase.title')}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <p className="text-muted-foreground text-sm leading-6">
                  {t('showcase.description')}
                </p>
                <Button asChild variant="outline" className="mt-auto w-full">
                  <a href={showcaseUrl} target="_blank" rel="noreferrer">
                    {t('showcase.cta')}
                    <ArrowUpRight data-icon="inline-end" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="h-full">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CodeXml className="size-5" aria-hidden="true" />
                </div>
                <CardTitle>
                  <h3>{t('repository.title')}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <p className="text-muted-foreground text-sm leading-6">
                  {t('repository.description')}
                </p>
                <Button asChild variant="outline" className="mt-auto w-full">
                  <a href={repositoryUrl} target="_blank" rel="noreferrer">
                    {t('repository.cta')}
                    <ArrowUpRight data-icon="inline-end" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
