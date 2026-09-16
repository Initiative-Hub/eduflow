'use client';

export type LiveGameAudience = 'HOST' | 'PARTICIPANT';

export type LiveGameSession =
  | { audience: 'HOST'; sessionId: string; version: 3 }
  | {
      audience: 'PARTICIPANT';
      guestGrant?: string;
      identityKind?: 'USER' | 'GUEST';
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
    if (
      selection.audience === 'PARTICIPANT' &&
      selection.identityKind === 'GUEST' &&
      (!selection.guestGrant || guestGrantExpired(selection.guestGrant))
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

function guestGrantExpired(token: string) {
  try {
    const encoded = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!encoded) return true;
    const payload = JSON.parse(atob(encoded)) as { exp?: number };
    return !payload.exp || payload.exp * 1_000 <= Date.now();
  } catch {
    return true;
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
