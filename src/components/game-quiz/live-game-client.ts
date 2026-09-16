'use client';

import { apiClient } from '@/lib/api/api-client';
import type {
  LiveGameClientMessage,
  LiveGameSnapshot,
} from '@/lib/game-quiz/runtime-protocol';

export type LiveGameTicketRequest =
  | { audience: 'HOST'; sessionId: string }
  | {
      audience: 'PARTICIPANT';
      displayName?: string;
      expectedSessionId?: string;
      guestGrant?: string;
      joinCode: string;
    };

export type LiveGameTicket = {
  avatarAccessExpiresAt: string;
  avatarAccessToken: string;
  expiresAt: string;
  guestGrant?: string;
  profile: { displayName: string; image: string | null };
  roomId: string;
  token: string;
};

export type LiveGameClientState = {
  error: string | null;
  snapshot: LiveGameSnapshot | null;
  status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
};

export type LiveGameOperation =
  | Omit<Extract<LiveGameClientMessage, { type: 'host.command' }>, 'requestId'>
  | Omit<
      Extract<LiveGameClientMessage, { type: 'player.answer' }>,
      'requestId'
    >;

export const requestLiveGameTicket = (request: LiveGameTicketRequest) =>
  apiClient.post<LiveGameTicket>('v1/live-game/ticket', request);

export const leaveLiveGameSession = (input: {
  gameQuizId: string;
  sessionId: string;
}) =>
  apiClient.post<{ ended: true }>(
    `v1/game-quizzes/${input.gameQuizId}/sessions/${input.sessionId}/leave`
  );

export type LiveGameAvatarUrl = { objectKey: string; signedUrl: string };

export const requestLiveGameAvatarUrls = (input: {
  avatarAccessToken: string;
  objectKeys: string[];
  sessionId: string;
}) =>
  apiClient.post<{ data: LiveGameAvatarUrl[] }>(
    'v1/live-game/avatar-urls',
    { objectKeys: input.objectKeys, sessionId: input.sessionId },
    { headers: { Authorization: `Bearer ${input.avatarAccessToken}` } }
  );
