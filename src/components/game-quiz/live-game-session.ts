'use client';

export type LiveGameAudience = 'HOST' | 'PARTICIPANT';

export type LiveGameSession =
  | { audience: 'HOST'; sessionId: string; version: 3 }
  | {
      audience: 'PARTICIPANT';
      joinCode: string;
      sessionId: string;
      version: 3;
    };

const storageKey = (audience: LiveGameAudience) =>
  `eduflow.live-game-session.v3.${audience.toLowerCase()}`;

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
      selection.version !== 3 ||
      selection.audience !== audience ||
      !selection.sessionId ||
      (audience === 'PARTICIPANT' &&
        (!('joinCode' in selection) || !selection.joinCode))
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
