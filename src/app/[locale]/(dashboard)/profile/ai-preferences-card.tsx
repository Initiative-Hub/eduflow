'use client';

import { useMutation } from '@tanstack/react-query';
import { Baby, type Bot, Briefcase, Cpu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { Locale } from '@/i18n/routing';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  AIPreferencesData,
  InteractionStyle,
  ResponseTone,
} from './profile.config';

export type { AIPreferencesData } from './profile.config';

interface AIPreferencesCardProps {
  preferences: AIPreferencesData;
  onChange: (preferences: AIPreferencesData) => void;
  isSaving?: boolean;
}

const INTERACTION_STYLES: {
  value: InteractionStyle;
  icon: typeof Bot;
  labelKey: string;
}[] = [
  { value: 'friendly', icon: Baby, labelKey: 'friendly' },
  { value: 'professional', icon: Briefcase, labelKey: 'professional' },
  { value: 'technical', icon: Cpu, labelKey: 'technical' },
];

const TONE_STEPS: ResponseTone[] = ['encouraging', 'balanced', 'direct'];

export function AIPreferencesCard({
  preferences,
  onChange,
  isSaving,
}: AIPreferencesCardProps) {
  const t = useTranslations('ProfilePage.aiPreferences');
  const router = useRouter();
  const currentLocale = useLocale();

  const [localPrefs, setLocalPrefs] = useState<AIPreferencesData>({
    ...preferences,
    primaryLanguage: currentLocale as 'en' | 'vi',
  });

  const { mutate: updateLocale, isPending: isUpdatingLocale } = useMutation({
    mutationFn: async (newLocale: Locale) => {
      await apiClient.post('/v1/infrastructure/languages', {
        locale: newLocale,
      });
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  const handleChange = <K extends keyof AIPreferencesData>(
    key: K,
    value: AIPreferencesData[K]
  ) => {
    const updated = { ...localPrefs, [key]: value };
    setLocalPrefs(updated);
    onChange(updated);
  };

  const handleLanguageChange = (newLanguage: 'en' | 'vi') => {
    handleChange('primaryLanguage', newLanguage);
    updateLocale(newLanguage);
  };

  const toneIndex = TONE_STEPS.indexOf(localPrefs.responseTone);
  const toneSliderValue = toneIndex === -1 ? 1 : toneIndex;
  const isDisabled = isSaving || isUpdatingLocale;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cpu className="size-4 text-primary" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Interaction Style & Response Tone Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* AI Interaction Style */}
          <div className="space-y-3">
            <Label className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {t('interactionStyle.label')}
            </Label>
            <div className="flex gap-3">
              {INTERACTION_STYLES.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleChange('interactionStyle', value)}
                  className={cn(
                    'flex w-20 cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all',
                    localPrefs.interactionStyle === value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
                  )}
                  aria-label={t(`interactionStyle.${labelKey}`)}
                >
                  <Icon className="size-5" />
                  <span className="font-medium text-[10px] leading-tight">
                    {t(`interactionStyle.${labelKey}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Response Tone */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                {t('responseTone.label')}
              </Label>
              <span className="font-medium text-primary text-sm capitalize">
                {t(`responseTone.${localPrefs.responseTone}`)}
              </span>
            </div>
            <div className="space-y-2">
              <Slider
                value={[toneSliderValue]}
                min={0}
                max={2}
                step={1}
                disabled={isDisabled}
                onValueChange={([val]) =>
                  handleChange('responseTone', TONE_STEPS[val])
                }
                className="w-full"
              />
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>{t('responseTone.encouraging')}</span>
                <span>{t('responseTone.balanced')}</span>
                <span>{t('responseTone.direct')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <div>
              <p className="font-medium text-foreground text-sm">
                {t('primaryLanguage.label')}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('primaryLanguage.description')}
              </p>
            </div>
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleLanguageChange('en')}
                className={cn(
                  'cursor-pointer px-4 py-1.5 font-medium text-sm transition-colors',
                  localPrefs.primaryLanguage === 'en'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                )}
              >
                {t('primaryLanguage.english')}
              </button>
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleLanguageChange('vi')}
                className={cn(
                  'cursor-pointer px-4 py-1.5 font-medium text-sm transition-colors',
                  localPrefs.primaryLanguage === 'vi'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                )}
              >
                {t('primaryLanguage.vietnamese')}
              </button>
            </div>
          </div>

          {/* Quiz Score Alerts */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <div>
              <p className="font-medium text-foreground text-sm">
                {t('quizScoreAlerts.label')}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('quizScoreAlerts.description')}
              </p>
            </div>
            <Switch
              checked={localPrefs.quizScoreAlerts}
              onCheckedChange={(checked) =>
                handleChange('quizScoreAlerts', checked)
              }
              disabled={isDisabled}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <div>
              <p className="font-medium text-foreground text-sm">
                {t('insightFeedback.label')}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('insightFeedback.description')}
              </p>
            </div>
            <Switch
              checked={localPrefs.insightFeedback}
              onCheckedChange={(checked) =>
                handleChange('insightFeedback', checked)
              }
              disabled={isDisabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
