import { Check, CheckCheck, Users, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PreviewFrame } from './preview-frame';

export async function AssessmentPreview() {
  const t = await getTranslations('LandingPage.features.preview');
  return (
    <PreviewFrame title={t('assessments.workspace')}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            {t('assessments.questionNumber')}
          </p>
          <Badge variant="outline">{t('assessments.reviewed')}</Badge>
        </div>
        <p className="font-heading font-medium text-lg leading-7">
          {t('assessments.question')}
        </p>
        <div className="grid gap-2">
          {(['evaporation', 'condensation', 'precipitation'] as const).map(
            (key, index) => (
              <div
                key={key}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-sm',
                  index === 0 && 'border-primary/40 bg-primary/5'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full border text-xs',
                    index === 0
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {index === 0 ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                {t(key)}
              </div>
            )
          )}
        </div>
        <p className="flex items-start gap-2 text-muted-foreground text-xs leading-5">
          <CheckCheck
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          {t('assessments.feedback')}
        </p>
      </div>
    </PreviewFrame>
  );
}

export async function GamePreview() {
  const t = await getTranslations('LandingPage.features.preview');
  return (
    <PreviewFrame title={t('games.workspace')}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge>
            <Zap data-icon="inline-start" />
            {t('games.round')}
          </Badge>
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Users className="size-3.5" aria-hidden="true" />
            {t('games.players')}
          </span>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-primary p-6 text-center text-primary-foreground">
          <span className="flex size-14 items-center justify-center rounded-full border-4 border-primary-foreground/25 font-heading font-semibold text-xl">
            {t('games.timer')}
          </span>
          <p className="max-w-xs font-heading font-medium text-xl leading-7">
            {t('games.question')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['rain', 'sun', 'wind', 'snow'] as const).map((key, index) => (
            <div
              key={key}
              className="flex items-center gap-2 rounded-xl border bg-background px-3 py-3 text-xs"
            >
              <span className="font-mono text-primary">
                {String.fromCharCode(65 + index)}
              </span>
              {t(`games.${key}`)}
            </div>
          ))}
        </div>
        <p className="text-center text-muted-foreground text-xs">
          {t('games.footer')}
        </p>
      </div>
    </PreviewFrame>
  );
}
