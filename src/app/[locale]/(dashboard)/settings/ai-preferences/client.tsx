'use client';

import { useState } from 'react';
import {
  type AIPreferencesData,
  DEFAULT_AI_PREFERENCES,
} from '../../profile/profile.config';
import { AIPreferencesCard } from './ai-preferences-card';

export default function AiPreferencesClient() {
  const [aiPreferences, setAiPreferences] = useState<AIPreferencesData>(
    DEFAULT_AI_PREFERENCES
  );

  const handleAiPreferencesChange = (newPreferences: AIPreferencesData) => {
    setAiPreferences(newPreferences);
    // TODO: Call service to save preferences.
  };

  return (
    <AIPreferencesCard
      preferences={aiPreferences}
      onChange={handleAiPreferencesChange}
      isSaving={false}
    />
  );
}
