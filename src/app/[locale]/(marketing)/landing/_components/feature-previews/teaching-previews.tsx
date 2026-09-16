import {
  ArrowRight,
  Check,
  CloudRain,
  CloudSun,
  FileText,
  Play,
  Waves,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PreviewFrame } from './preview-frame';

const stages = [
  { key: 'evaporation', icon: Waves },
  { key: 'condensation', icon: CloudSun },
  { key: 'precipitation', icon: CloudRain },
] as const;

async function WaterCycle({ compact = false }: { compact?: boolean }) {
  const t = await getTranslations('LandingPage.features.preview');
  return (
    <div className={cn('grid grid-cols-3 gap-2', !compact && 'py-3')}>
      {stages.map(({ key, icon: Icon }, index) => (
        <div
          key={key}
          className="relative flex min-w-0 flex-col items-center gap-3 text-center"
        >
          <div
            className={cn(
              'flex items-center justify-center rounded-2xl bg-primary/10 text-primary',
              compact ? 'size-10' : 'size-14 sm:size-16'
            )}
          >
            <Icon
              className={compact ? 'size-5' : 'size-7'}
              aria-hidden="true"
            />
          </div>
          <span className="break-words text-xs leading-5">{t(key)}</span>
          {index < 2 && (
            <ArrowRight
              className="absolute top-5 -right-3 size-4 text-primary/40"
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export async function LessonPreview() {
  const t = await getTranslations('LandingPage.features.preview');
  return (
    <PreviewFrame title={t('lessons.workspace')}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-muted-foreground">
            <FileText className="size-4 text-primary" aria-hidden="true" />
            {t('source')}
          </span>
          <ArrowRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Badge variant="secondary">{t('lessons.editable')}</Badge>
        </div>
        <div>
          <p className="mb-2 font-medium text-primary text-xs uppercase tracking-wider">
            {t('lessons.module')}
          </p>
          <p className="font-heading font-semibold text-2xl">{t('topic')}</p>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            {t('lessons.objective')}
          </p>
        </div>
        <WaterCycle />
        <div className="flex items-start gap-3 rounded-xl bg-primary/5 p-3 text-sm leading-6">
          <Check
            className="mt-1 size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          {t('lessons.activity')}
        </div>
      </div>
    </PreviewFrame>
  );
}

export async function PresentationPreview() {
  const t = await getTranslations('LandingPage.features.preview');
  return (
    <PreviewFrame title={t('presentations.workspace')}>
      <div className="flex flex-col gap-4">
        <div className="relative overflow-hidden rounded-xl border bg-primary/5 p-5 sm:p-7">
          <p className="text-primary text-xs uppercase tracking-wider">
            {t('presentations.chapter')}
          </p>
          <p className="mt-3 max-w-xs font-heading font-semibold text-2xl leading-tight sm:text-3xl">
            {t('topic')}
          </p>
          <p className="mt-2 mb-6 text-muted-foreground text-sm">
            {t('presentations.subtitle')}
          </p>
          <WaterCycle compact />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['intro', 'cycle', 'reflection'] as const).map((key, index) => (
            <div
              key={key}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-2.5 text-xs',
                index === 1
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <span className="font-mono text-[10px] opacity-60">
                0{index + 1}
              </span>
              <span className="truncate">{t(`presentations.${key}`)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 text-muted-foreground text-xs">
          <span>{t('presentations.export')}</span>
          <span className="flex items-center gap-1.5 text-primary">
            <Play className="size-3" aria-hidden="true" />
            {t('presentations.ready')}
          </span>
        </div>
      </div>
    </PreviewFrame>
  );
}
