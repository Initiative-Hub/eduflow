'use client';

import { useQuery } from '@tanstack/react-query';
import usePartySocket from 'partysocket/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type LiveGameClientMessage,
  liveGameServerMessageSchema,
  liveGameSnapshotSchema,
} from '@/lib/game-quiz/runtime-protocol';
import {
  hydrateLiveGameSnapshotAvatars,
  liveGameAvatarObjectKeys,
} from './live-game-avatar-hydration';
import {
  type LiveGameClientState,
  type LiveGameOperation,
  type LiveGameTicket,
  requestLiveGameAvatarUrls,
  requestLiveGameTicket,
} from './live-game-client';
import type { LiveGameSession } from './live-game-session';
import { clearLiveGameSession } from './live-game-session';

const initialState: LiveGameClientState = {
  error: null,
  snapshot: null,
  status: 'CONNECTING',
};

type PendingOperation = {
  reject: (error: Error) => void;
  resolve: () => void;
  timeout: ReturnType<typeof setTimeout>;
};

export function useLiveGameClient(selection: LiveGameSession | null) {
  const pending = useRef(new Map<string, PendingOperation>());
  const avatarAccessToken = useRef<string | null>(null);
  const profile = useRef<LiveGameTicket['profile'] | null>(null);
  const [state, setState] = useState(initialState);
  const audience = selection?.audience;
  const joinCode =
    selection?.audience === 'PARTICIPANT' ? selection.joinCode : undefined;
  const sessionId = selection?.sessionId;
  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'live-game.invalid';

  const query = useCallback(async () => {
    if (!audience || !sessionId) {
      throw new Error('A live-game session is required.');
    }
    if (audience === 'PARTICIPANT' && !joinCode) {
      throw new Error('A participant join code is required.');
    }
    let ticket: LiveGameTicket;
    try {
      ticket =
        audience === 'HOST'
          ? await requestLiveGameTicket({ audience: 'HOST', sessionId })
          : await requestLiveGameTicket({
              audience: 'PARTICIPANT',
              expectedSessionId: sessionId,
              guestGrant:
                selection?.audience === 'PARTICIPANT'
                  ? selection.guestGrant
                  : undefined,
              joinCode: joinCode!,
            });
    } catch (error) {
      if (
        selection?.audience === 'PARTICIPANT' &&
        selection.identityKind === 'GUEST' &&
        [401, 403].includes((error as { status?: number }).status ?? 0)
      ) {
        clearLiveGameSession('PARTICIPANT', sessionId);
        window.location.replace('/games/join');
      }
      throw error;
    }
    profile.current = ticket.profile;
    avatarAccessToken.current = ticket.avatarAccessToken;
    return { token: ticket.token };
  }, [audience, joinCode, selection, sessionId]);

  const onOpen = useCallback(() => {
    setState((current) => ({ ...current, error: null, status: 'CONNECTED' }));
  }, []);

  const onClose = useCallback(() => {
    setState((current) => ({ ...current, status: 'DISCONNECTED' }));
  }, []);

  const onError = useCallback(() => {
    setState((current) => ({
      ...current,
      error: 'The live-game connection failed.',
    }));
  }, []);

  const onMessage = useCallback((event: MessageEvent) => {
    let payload: unknown;
    try {
      payload = JSON.parse(String(event.data));
    } catch {
      setState((current) => ({
        ...current,
        error: 'The game server returned an invalid message.',
      }));
      return;
    }
    const parsed = liveGameServerMessageSchema.safeParse(payload);
    if (!parsed.success) {
      setState((current) => ({
        ...current,
        error: 'The game server returned an invalid message.',
      }));
      return;
    }
    const message = parsed.data;
    if (message.type === 'session.snapshot') {
      setState((current) => ({
        ...current,
        snapshot: liveGameSnapshotSchema.parse(message.snapshot),
      }));
      return;
    }
    if (message.type === 'operation.result') {
      const operation = pending.current.get(message.requestId);
      if (operation) {
        clearTimeout(operation.timeout);
        operation.resolve();
        pending.current.delete(message.requestId);
      }
      return;
    }
    if (message.type === 'error') {
      const operation = message.requestId
        ? pending.current.get(message.requestId)
        : null;
      if (operation) {
        clearTimeout(operation.timeout);
        operation.reject(new Error(message.message));
        pending.current.delete(message.requestId!);
      } else {
        setState((current) => ({ ...current, error: message.message }));
      }
    }
  }, []);

  const socket = usePartySocket({
    enabled: Boolean(selection),
    host,
    onClose,
    onError,
    onOpen,
    onMessage,
    party: 'main',
    query,
    room: sessionId ?? 'live-game-unavailable',
  });

  useEffect(() => {
    profile.current = null;
    avatarAccessToken.current = null;
    setState(initialState);
    return () => {
      for (const operation of pending.current.values()) {
        clearTimeout(operation.timeout);
        operation.reject(new Error('The live-game connection was closed.'));
      }
      pending.current.clear();
    };
  }, [audience, joinCode, sessionId]);

  useEffect(() => {
    if (state.status !== 'CONNECTED' || !profile.current) return;
    socket.send(
      JSON.stringify({
        type: 'session.sync',
        requestId: crypto.randomUUID(),
        ...profile.current,
      } satisfies LiveGameClientMessage)
    );
  }, [socket, state.status]);

  const send = useCallback(
    (message: LiveGameOperation) => {
      if (!sessionId) {
        return Promise.reject(new Error('A live-game session is required.'));
      }
      const requestId = crypto.randomUUID();
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.current.delete(requestId);
          reject(new Error('The live-game operation timed out.'));
        }, 10_000);
        pending.current.set(requestId, { reject, resolve, timeout });
        socket.send(JSON.stringify({ ...message, requestId }));
      });
    },
    [sessionId, socket]
  );

  const reconnect = useCallback(() => {
    if (!sessionId) return;
    setState(initialState);
    socket.reconnect();
  }, [sessionId, socket]);

  const rawSnapshot = state.snapshot;
  const objectKeys = useMemo(
    () => liveGameAvatarObjectKeys(rawSnapshot),
    [rawSnapshot]
  );
  const avatarUrlsQuery = useQuery({
    enabled: Boolean(
      sessionId && avatarAccessToken.current && objectKeys.length
    ),
    queryFn: () =>
      requestLiveGameAvatarUrls({
        avatarAccessToken: avatarAccessToken.current!,
        objectKeys,
        sessionId: sessionId!,
      }),
    queryKey: ['live-game-avatar-urls', sessionId, objectKeys],
    refetchInterval: 25 * 60 * 1_000,
    staleTime: 25 * 60 * 1_000,
  });
  const signedUrls = useMemo(
    () =>
      new Map(
        (avatarUrlsQuery.data?.data ?? []).map(({ objectKey, signedUrl }) => [
          objectKey,
          signedUrl,
        ])
      ),
    [avatarUrlsQuery.data]
  );
  const snapshot = useMemo(
    () => hydrateLiveGameSnapshotAvatars(rawSnapshot, signedUrls),
    [rawSnapshot, signedUrls]
  );

  return { ...state, reconnect, send, snapshot };
}
