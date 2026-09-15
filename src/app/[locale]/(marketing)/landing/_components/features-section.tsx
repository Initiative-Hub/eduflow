import type { LucideIcon } from 'lucide-react';
import {
  AudioLines,
  BookOpenText,
  Bot,
  FileChartColumn,
  Gamepad2,
  Presentation,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SectionHeading } from './section-heading';

interface FeatureDefinition {
  icon: LucideIcon;
  key:
    | 'lessons'
    | 'presentations'
    | 'assessments'
    | 'games'
    | 'assistants'
    | 'english';
  layout: string;
}

const features: FeatureDefinition[] = [
  { icon: BookOpenText, key: 'lessons', layout: 'lg:col-span-7' },
  { icon: Presentation, key: 'presentations', layout: 'lg:col-span-5' },
  { icon: FileChartColumn, key: 'assessments', layout: 'lg:col-span-5' },
  { icon: Gamepad2, key: 'games', layout: 'lg:col-span-7' },
  { icon: Bot, key: 'assistants', layout: 'lg:col-span-7' },
  { icon: AudioLines, key: 'english', layout: 'lg:col-span-5' },
];

export async function FeaturesSection() {
  const t = await getTranslations('LandingPage.features');

  return (
    <section
      id="features"
      className="scroll-mt-24 bg-muted/40 px-4 py-24 sm:px-6 lg:px-8 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          align="center"
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
        />
        <div className="mt-14 grid gap-5 lg:grid-cols-12">
          {features.map(({ icon: Icon, key, layout }, index) => (
            <Card
              key={key}
              className={cn(
                'min-h-72',
                layout,
                index % 3 === 0 && 'lg:min-h-80'
              )}
            >
              <CardHeader>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <Badge variant="outline">{t(`${key}.label`)}</Badge>
                </div>
                <CardTitle>
                  <h3 className="max-w-lg text-2xl">{t(`${key}.title`)}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="max-w-xl text-base text-muted-foreground leading-7">
                  {t(`${key}.description`)}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3" aria-hidden="true">
                  <div className="h-2 rounded-full bg-primary/20" />
                  <div className="h-2 rounded-full bg-muted" />
                  <div className="col-span-2 h-16 rounded-xl border bg-background/70" />
                </div>
              </CardContent>
              <CardFooter>
                <p className="font-medium text-sm">{t(`${key}.outcome`)}</p>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
