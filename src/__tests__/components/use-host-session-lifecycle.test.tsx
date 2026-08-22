import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  activateLiveGameSession,
  readLiveGameSession,
} from '@/components/game-quiz/live-game-session';
import {
  closeHostSessionOnUnload,
  useHostSessionLifecycle,
} from '@/components/game-quiz/use-host-session-lifecycle';

const { heartbeatHost } = vi.hoisted(() => ({ heartbeatHost: vi.fn() }));

vi.mock('@/components/game-quiz/api', () => ({
  gameQuizApi: { heartbeatHost },
}));

const gameQuizId = '00000000-0000-4000-8000-000000000010';
const sessionId = '00000000-0000-4000-8000-000000000001';

function HostLifecycle() {
  useHostSessionLifecycle({ gameQuizId, isSessionReady: true, sessionId });
  return null;
}

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  heartbeatHost.mockReset();
});

describe('useHostSessionLifecycle', () => {
  it('sends the selected session ID in the unload close request', () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()));
    vi.stubGlobal('fetch', fetchMock);

    closeHostSessionOnUnload(gameQuizId, sessionId);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/game-quizzes/${gameQuizId}/live-game/close`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Live-Game-Session': sessionId,
        }),
        keepalive: true,
        method: 'POST',
      })
    );
  });

  it('closes once when the host page hides or unmounts', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()));
    vi.stubGlobal('fetch', fetchMock);
    activateLiveGameSession({ audience: 'HOST', sessionId, version: 2 });
    const rendered = render(<HostLifecycle />);

    window.dispatchEvent(new Event('pagehide'));
    rendered.unmount();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(heartbeatHost).toHaveBeenCalledWith(gameQuizId, sessionId);
    expect(readLiveGameSession('HOST')).toBeNull();
  });

  it('requests confirmation before a browser unload without closing first', () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()));
    vi.stubGlobal('fetch', fetchMock);
    render(<HostLifecycle />);

    const event = new Event('beforeunload', {
      cancelable: true,
    }) as BeforeUnloadEvent;
    const setReturnValue = vi.fn();
    Object.defineProperty(event, 'returnValue', { set: setReturnValue });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(setReturnValue).toHaveBeenCalledWith('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('closes when a host client unmounts during in-app navigation', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()));
    vi.stubGlobal('fetch', fetchMock);
    const rendered = render(<HostLifecycle />);

    rendered.unmount();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not close during the React Strict Mode effect rehearsal', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()));
    vi.stubGlobal('fetch', fetchMock);
    const rendered = render(
      <StrictMode>
        <HostLifecycle />
      </StrictMode>
    );

    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();

    rendered.unmount();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
