import { BookMarked, ClipboardList, Tag } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { StudyUploadZone } from './study-upload-zone';

const FEATURE_CARDS = [
  {
    key: 'reviewMaterials' as const,
    icon: BookMarked,
    accent:
      'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/40',
  },
  {
    key: 'practiceTests' as const,
    icon: ClipboardList,
    accent:
      'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40',
  },
  {
    key: 'keywordSummaries' as const,
    icon: Tag,
    accent:
      'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40',
  },
] as const;

export async function StudyClient() {
  const t = await getTranslations('StudyPage');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      {/* Header */}
      <div className="space-y-8 px-4 pt-6 text-center">
        <div className="relative flex flex-col items-center text-center">
          <h1 className="mt-5 font-black font-heading text-3xl text-foreground leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {t.rich('title', {
              accent: (chunks) => (
                <span className="text-primary italic">{chunks}</span>
              ),
            })}
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-base text-muted-foreground leading-7 sm:text-lg">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FEATURE_CARDS.map(({ key, icon: Icon, accent }) => (
          <Card
            key={key}
            className="cursor-pointer rounded-2xl border border-border/60 bg-card/95 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className={`mb-3 flex size-10 items-center justify-center rounded-xl border ${accent}`}
            >
              <Icon className="size-5" />
            </div>
            <h2 className="font-bold text-foreground text-sm leading-snug">
              {t(`features.${key}.title`)}
            </h2>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              {t(`features.${key}.description`)}
            </p>
          </Card>
        ))}
      </div>

      <StudyUploadZone />
    </div>
  );
}
