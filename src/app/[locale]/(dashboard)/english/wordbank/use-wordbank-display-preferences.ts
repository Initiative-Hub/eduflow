'use client';

import { useEffect, useState } from 'react';

export type WordbankView = 'grid' | 'list';

interface WordbankDisplayPreferences {
  view: WordbankView;
  practiceMode: boolean;
}

const STORAGE_KEY = 'eduflow:wordbank-display:v1';
const DEFAULT_PREFERENCES: WordbankDisplayPreferences = {
  view: 'grid',
  practiceMode: false,
};

function readPreferences(): WordbankDisplayPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? 'null'
    ) as Partial<WordbankDisplayPreferences> | null;

    return {
      view: parsed?.view === 'list' ? 'list' : 'grid',
      practiceMode: Boolean(parsed?.practiceMode),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function useWordbankDisplayPreferences() {
  const [preferences, setPreferences] =
    useState<WordbankDisplayPreferences>(readPreferences);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  return { preferences, setPreferences };
}
