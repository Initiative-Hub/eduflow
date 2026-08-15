'use client';

export type LiveGameAudience = 'HOST' | 'PARTICIPANT';

export type LiveGameContext = {
  audience: LiveGameAudience;
  contextKey: string;
  expiresAt: string;
  token: string;
  version: 1;
};

const storageKey = (audience: LiveGameAudience) =>
  `eduflow.live-game-context.v1.${audience.toLowerCase()}`;

export function activateLiveGameContext(context: LiveGameContext) {
  sessionStorage.setItem(storageKey(context.audience), JSON.stringify(context));
}

export function readLiveGameContext(audience: LiveGameAudience) {
  const stored = sessionStorage.getItem(storageKey(audience));
  if (!stored) return null;
  try {
    const context = JSON.parse(stored) as LiveGameContext;
    if (
      context.version !== 1 ||
      context.audience !== audience ||
      !context.token ||
      new Date(context.expiresAt) <= new Date()
    ) {
      sessionStorage.removeItem(storageKey(audience));
      return null;
    }
    return context;
  } catch {
    sessionStorage.removeItem(storageKey(audience));
    return null;
  }
}

export function clearLiveGameContext(
  audience: LiveGameAudience,
  expectedKey?: string
) {
  const context = readLiveGameContext(audience);
  if (!expectedKey || context?.contextKey === expectedKey) {
    sessionStorage.removeItem(storageKey(audience));
  }
}
