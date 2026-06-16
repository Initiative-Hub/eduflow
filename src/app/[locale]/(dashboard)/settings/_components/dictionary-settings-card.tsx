'use client';

import { BookOpen, GraduationCap, Library } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDictionaryPreference } from '@/hooks/use-dictionary-preference';
import { cn } from '@/lib/utils';
import type { DictionaryProviderId } from '@/services/dictionary/types';

interface ProviderOption {
  id: DictionaryProviderId;
  icon: typeof BookOpen;
  labelKey: string;
  descriptionKey: string;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: 'mw-collegiate',
    icon: Library,
    labelKey: 'mwCollegiate',
    descriptionKey: 'mwCollegiateDescription',
  },
  {
    id: 'mw-learners',
    icon: GraduationCap,
    labelKey: 'mwLearners',
    descriptionKey: 'mwLearnersDescription',
  },
  {
    id: 'free-dictionary',
    icon: BookOpen,
    labelKey: 'freeDictionary',
    descriptionKey: 'freeDictionaryDescription',
  },
];

export function DictionarySettingsCard() {
  const t = useTranslations('DictionarySettings');
  const { provider, setProvider } = useDictionaryPreference();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {PROVIDER_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = provider === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setProvider(option.id)}
                className={cn(
                  'flex items-start gap-4 rounded-lg border p-4 text-left transition-all hover:bg-accent/50',
                  isSelected &&
                    'border-primary bg-primary/5 ring-1 ring-primary/20'
                )}
              >
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-medium text-sm',
                        isSelected ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {t(option.labelKey)}
                    </span>
                    {isSelected && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                        {t('active')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {t(option.descriptionKey)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
