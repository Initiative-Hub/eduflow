import { afterEach, describe, expect, it } from 'vitest';
import {
  activateLiveGameSession,
  readLiveGameSession,
} from '@/components/game-quiz/live-game-session';
import { issueLiveGameGuestGrant } from '@/lib/game-quiz/live-game-security';

const originalStorage = Object.getOwnPropertyDescriptor(
  window,
  'sessionStorage'
);

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

function selectTab(tab: ReturnType<typeof storage>) {
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    value: tab,
  });
}

function grant(exp: number) {
  return `header.${btoa(JSON.stringify({ exp }))}.signature`;
}

afterEach(() => {
  if (originalStorage) {
    Object.defineProperty(window, 'sessionStorage', originalStorage);
  }
});

describe('guest live-game tab selection', () => {
  it('resumes within a tab and keeps newly opened tabs independent', async () => {
    const first = storage();
    const second = storage();
    const validGrant = (
      await issueLiveGameGuestGrant({
        displayName: 'Taylor',
        guestId: '00000000-0000-4000-8000-000000000001',
        secret: 'ticket-secret-that-is-at-least-32-characters-long',
        sessionId: '00000000-0000-4000-8000-000000000002',
      })
    ).token;
    selectTab(first);
    activateLiveGameSession({
      audience: 'PARTICIPANT',
      guestGrant: validGrant,
      identityKind: 'GUEST',
      joinCode: '123456',
      sessionId: 'room-one',
      version: 3,
    });
    expect(readLiveGameSession('PARTICIPANT')?.sessionId).toBe('room-one');

    selectTab(second);
    expect(readLiveGameSession('PARTICIPANT')).toBeNull();
    activateLiveGameSession({
      audience: 'PARTICIPANT',
      guestGrant: validGrant,
      identityKind: 'GUEST',
      joinCode: '123456',
      sessionId: 'room-two',
      version: 3,
    });
    selectTab(first);
    expect(readLiveGameSession('PARTICIPANT')?.sessionId).toBe('room-one');
    selectTab(second);
    expect(readLiveGameSession('PARTICIPANT')?.sessionId).toBe('room-two');
  });

  it('clears a guest selection if the grant is missing or expired', () => {
    const tab = storage();
    selectTab(tab);
    activateLiveGameSession({
      audience: 'PARTICIPANT',
      guestGrant: grant(Math.floor(Date.now() / 1_000) - 1),
      identityKind: 'GUEST',
      joinCode: '123456',
      sessionId: 'room-one',
      version: 3,
    });
    expect(readLiveGameSession('PARTICIPANT')).toBeNull();
    activateLiveGameSession({
      audience: 'PARTICIPANT',
      identityKind: 'GUEST',
      joinCode: '123456',
      sessionId: 'room-one',
      version: 3,
    });
    expect(readLiveGameSession('PARTICIPANT')).toBeNull();
  });
});
