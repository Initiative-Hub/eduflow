'use client';

export type LiveGameAudience = 'HOST' | 'PARTICIPANT';

export type LiveGameSession = {
  audience: LiveGameAudience;
  sessionId: string;
  version: 2;
};

const storageKey = (audience: LiveGameAudience) =>
  `eduflow.live-game-session.v2.${audience.toLowerCase()}`;

export function activateLiveGameSession(selection: LiveGameSession) {
  sessionStorage.setItem(
    storageKey(selection.audience),
    JSON.stringify(selection)
  );
}

export function readLiveGameSession(audience: LiveGameAudience) {
  const stored = sessionStorage.getItem(storageKey(audience));
  if (!stored) return null;
  try {
    const selection = JSON.parse(stored) as LiveGameSession;
    if (
      selection.version !== 2 ||
      selection.audience !== audience ||
      !selection.sessionId
    ) {
      sessionStorage.removeItem(storageKey(audience));
      return null;
    }
    return selection;
  } catch {
    sessionStorage.removeItem(storageKey(audience));
    return null;
  }
}

export function clearLiveGameSession(
  audience: LiveGameAudience,
  expectedSessionId?: string
) {
  const selection = readLiveGameSession(audience);
  if (!expectedSessionId || selection?.sessionId === expectedSessionId) {
    sessionStorage.removeItem(storageKey(audience));
  }
}
