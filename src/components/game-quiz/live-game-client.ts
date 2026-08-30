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
      expectedSessionId?: string;
      joinCode: string;
    };

export type LiveGameTicket = {
  expiresAt: string;
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
