'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { DictionaryProviderId } from '@/services/dictionary/types';

const STORAGE_KEY = 'dictionary-provider-preference';
const DEFAULT_PROVIDER: DictionaryProviderId = 'free-dictionary';

const VALID_PROVIDERS: DictionaryProviderId[] = [
  'free-dictionary',
  'mw-collegiate',
  'mw-learners',
];

function getSnapshot(): DictionaryProviderId {
  if (typeof window === 'undefined') return DEFAULT_PROVIDER;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && VALID_PROVIDERS.includes(stored as DictionaryProviderId)) {
    return stored as DictionaryProviderId;
  }
  return DEFAULT_PROVIDER;
}

function getServerSnapshot(): DictionaryProviderId {
  return DEFAULT_PROVIDER;
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function useDictionaryPreference() {
  const provider = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setProvider = useCallback((id: DictionaryProviderId) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    emitChange();
  }, []);

  return { provider, setProvider };
}
