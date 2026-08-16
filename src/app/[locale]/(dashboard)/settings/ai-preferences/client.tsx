'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type AIPreferencesData,
  DEFAULT_AI_PREFERENCES,
} from '../../profile/profile.config';
import {
  AI_PREFERENCES_QUERY_KEY,
  aiPreferencesService,
} from './ai-preferences.service';
import { AIPreferencesCard } from './ai-preferences-card';
import CustomInstructionsCard from './custom-instructions-card';

export default function AiPreferencesClient() {
  const t = useTranslations('ProfilePage.aiPreferences.customInstructions');

  const [aiPreferences, setAiPreferences] = useState<AIPreferencesData>(
    DEFAULT_AI_PREFERENCES
  );

  const preferencesQuery = useQuery({
    queryKey: AI_PREFERENCES_QUERY_KEY,
    queryFn: aiPreferencesService.get,
  });

  const handleAiPreferencesChange = (newPreferences: AIPreferencesData) => {
    setAiPreferences(newPreferences);
    // TODO: Call service to save preferences.
  };

  return (
    <div className="space-y-6">
      <AIPreferencesCard
        preferences={aiPreferences}
        onChange={handleAiPreferencesChange}
        isSaving={false}
      />

      {preferencesQuery.isPending && (
        <Skeleton className="h-72 w-full rounded-xl" />
      )}

      {preferencesQuery.isError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{t('loadFailed')}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{t('loadFailedDescription')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => preferencesQuery.refetch()}
            >
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {preferencesQuery.data && (
        <CustomInstructionsCard
          initialValue={preferencesQuery.data.customInstructions ?? ''}
        />
      )}
    </div>
  );
}
