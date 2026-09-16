import {
  ArrowRight,
  AudioLines,
  BookOpenText,
  Bot,
  Check,
  FileChartColumn,
  Gamepad2,
  Presentation,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from '@/i18n/navigation';
import {
  AssessmentPreview,
  GamePreview,
} from './feature-previews/practice-previews';
import {
  AssistantPreview,
  EnglishPreview,
} from './feature-previews/support-previews';
import {
  LessonPreview,
  PresentationPreview,
} from './feature-previews/teaching-previews';
import { Reveal } from './reveal';
import { SectionHeading } from './section-heading';

const features = [
  { icon: BookOpenText, key: 'lessons', preview: LessonPreview },
  { icon: Presentation, key: 'presentations', preview: PresentationPreview },
  { icon: FileChartColumn, key: 'assessments', preview: AssessmentPreview },
  { icon: Gamepad2, key: 'games', preview: GamePreview },
  { icon: Bot, key: 'assistants', preview: AssistantPreview },
  { icon: AudioLines, key: 'english', preview: EnglishPreview },
] as const;

export async function FeaturesSection() {
  const t = await getTranslations('LandingPage.features');

  return (
    <section
      id="features"
      className="scroll-mt-24 bg-muted/40 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
    >
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          align="center"
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
        />
        <Tabs defaultValue="lessons" className="mt-10 gap-5 sm:mt-12">
          <TabsList
            aria-label={t('navigationLabel')}
            className="grid w-full grid-cols-3 gap-1 rounded-2xl p-1.5 group-data-horizontal/tabs:h-auto sm:grid-cols-6"
          >
            {features.map(({ icon: Icon, key }) => (
              <TabsTrigger
                key={key}
                value={key}
                className="min-h-16 flex-col gap-2 rounded-xl px-2 py-3 sm:min-h-20 sm:gap-2.5"
              >
                <Icon aria-hidden="true" />
                {t(`${key}.label`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {features.map(({ key, preview: Preview }) => (
            <TabsContent key={key} value={key}>
              <article className="grid overflow-hidden rounded-3xl border bg-card shadow-primary/5 shadow-xl lg:grid-cols-12">
                <div className="flex flex-col items-start gap-6 p-6 sm:p-9 lg:col-span-5 lg:p-10">
                  <div className="flex items-center gap-2 font-medium text-primary text-xs uppercase tracking-widest">
                    <span
                      className="size-1.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    {t(`${key}.label`)}
                  </div>
                  <h3 className="text-balance font-heading font-semibold text-3xl leading-tight tracking-tight sm:text-4xl">
                    {t(`${key}.title`)}
                  </h3>
                  <p className="max-w-lg text-pretty text-base text-muted-foreground leading-7">
                    {t(`${key}.description`)}
                  </p>
                  <p className="flex items-start gap-3 text-sm leading-6">
                    <Check
                      className="mt-1 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {t(`${key}.outcome`)}
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    className="mt-auto min-h-11 gap-3"
                  >
                    <Link href="/register">
                      {t('cta')}
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
                <div className="relative flex min-w-0 items-center justify-center overflow-hidden border-t bg-primary/5 p-4 sm:p-8 lg:col-span-7 lg:border-t-0 lg:border-l lg:p-10">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_65%)]"
                  />
                  <Reveal className="relative w-full min-w-0 max-w-xl">
                    <Preview />
                  </Reveal>
                </div>
              </article>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
