import { AudioLines, Bot, Lightbulb, Volume2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { PreviewFrame } from './preview-frame';

export async function AssistantPreview() {
  const t = await getTranslations('LandingPage.features.preview');
  return (
    <PreviewFrame title={t('assistants.workspace')}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-sm">{t('assistants.tutor')}</p>
            <p className="text-muted-foreground text-xs">{t('topic')}</p>
          </div>
        </div>
        <blockquote className="ml-8 rounded-2xl rounded-tr-sm bg-muted p-4 text-sm leading-6">
          {t('assistants.student')}
        </blockquote>
        <blockquote className="mr-5 rounded-2xl rounded-tl-sm border border-primary/20 bg-primary/5 p-4 text-sm leading-6">
          {t('assistants.response')}
        </blockquote>
        <div className="flex items-start gap-3 text-muted-foreground text-xs leading-5">
          <Lightbulb
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          {t('assistants.hint')}
        </div>
        <Badge variant="outline">{t('assistants.source')}</Badge>
      </div>
    </PreviewFrame>
  );
}

export async function EnglishPreview() {
  const t = await getTranslations('LandingPage.features.preview');
  return (
    <PreviewFrame title={t('english.workspace')}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="outline">{t('english.wordType')}</Badge>
            <p className="mt-3 break-words font-heading font-semibold text-3xl">
              {t('english.word')}
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              {t('english.phonetic')}
            </p>
          </div>
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Volume2 className="size-5" />
          </span>
        </div>
        <p className="font-medium text-primary text-sm">
          {t('english.translation')}
        </p>
        <blockquote className="rounded-xl bg-background p-4 text-sm leading-6">
          {t('english.example')}
        </blockquote>
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <AudioLines
            className="size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="flex flex-1 items-center gap-1" aria-hidden="true">
            {[12, 20, 14, 28, 34, 18, 26, 16, 32, 22, 14, 24, 18, 10].map(
              (height, index) => (
                <span
                  key={index}
                  className="w-1 flex-1 rounded-full bg-primary/40"
                  style={{ height }}
                />
              )
            )}
          </div>
          <span className="font-medium text-primary text-xs">
            {t('english.practice')}
          </span>
        </div>
      </div>
    </PreviewFrame>
  );
}
