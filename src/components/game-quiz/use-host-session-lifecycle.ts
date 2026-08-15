'use client';

import { useEffect, useRef } from 'react';
import { gameQuizApi } from './api';
import { clearLiveGameSession } from './live-game-session';

export function closeHostSessionOnUnload(
  gameQuizId: string,
  sessionId: string
) {
  void fetch(`/api/v1/game-quizzes/${gameQuizId}/live-game/close`, {
    body: '{}',
    headers: {
      'Content-Type': 'application/json',
      'X-Live-Game-Session': sessionId,
    },
    keepalive: true,
    method: 'POST',
  }).catch(() => undefined);
}

export function useHostSessionLifecycle({
  gameQuizId,
  isSessionReady,
  sessionId,
}: {
  gameQuizId: string;
  isSessionReady: boolean;
  sessionId: string | undefined;
}) {
  const hasClosed = useRef(false);
  const lifecycleVersion = useRef(0);

  useEffect(() => {
    if (!isSessionReady || !sessionId) return;

    const version = lifecycleVersion.current + 1;
    lifecycleVersion.current = version;
    const close = () => {
      if (hasClosed.current) return;
      hasClosed.current = true;
      clearLiveGameSession('HOST', sessionId);
      closeHostSessionOnUnload(gameQuizId, sessionId);
    };
    const confirmExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const heartbeat = () =>
      void gameQuizApi.heartbeatHost(gameQuizId, sessionId);
    heartbeat();
    const heartbeatInterval = window.setInterval(heartbeat, 10_000);
    window.addEventListener('beforeunload', confirmExit);
    window.addEventListener('pagehide', close);

    return () => {
      window.clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', confirmExit);
      window.removeEventListener('pagehide', close);
      queueMicrotask(() => {
        if (lifecycleVersion.current === version) close();
      });
    };
  }, [gameQuizId, isSessionReady, sessionId]);
}
