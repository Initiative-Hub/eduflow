'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TranslationProvider } from '@/services/english/TranslationService';

const STORAGE_KEY = 'translation-provider-preference';
const DEFAULT_PROVIDER: TranslationProvider = 'amazon';

export function useTranslationPreference() {
  const [provider, setProviderState] =
    useState<TranslationProvider>(DEFAULT_PROVIDER);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        STORAGE_KEY
      ) as TranslationProvider | null;
      if (stored && ['amazon', 'mymemory', 'ai'].includes(stored)) {
        setProviderState(stored);
      }
    } catch {
      // localStorage unavailable (SSR/private browsing)
    }
  }, []);

  const setProvider = useCallback((next: TranslationProvider) => {
    setProviderState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  return { provider, setProvider };
}
