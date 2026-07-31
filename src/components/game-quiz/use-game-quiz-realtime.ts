'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createRealtime } from '@upstash/realtime/client';
import {
  gameQuizHostChannel,
  gameQuizPlayerChannel,
  type gameQuizRealtimeEventSchemas,
  gameQuizSharedChannel,
} from '@/lib/game-quiz/realtime-events';

const realtime = createRealtime<typeof gameQuizRealtimeEventSchemas>();

export function useGameQuizRealtime({
  sessionId,
  audience,
  participantId,
}: {
  sessionId: string;
  audience: 'HOST' | 'PARTICIPANT';
  participantId?: string;
}) {
  const queryClient = useQueryClient();
  const validSessionId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sessionId
    );
  const channels = validSessionId
    ? [
        gameQuizSharedChannel(sessionId),
        audience === 'HOST' ? gameQuizHostChannel(sessionId) : undefined,
        audience === 'PARTICIPANT' && participantId
          ? gameQuizPlayerChannel(sessionId, participantId)
          : undefined,
      ]
    : [];

  return realtime.useRealtime({
    channels,
    events: [
      'gameQuiz.sharedUpdated',
      'gameQuiz.hostProgressUpdated',
      'gameQuiz.playerUpdated',
    ],
    enabled: validSessionId,
    onData: () => {
      void queryClient.invalidateQueries({
        queryKey: ['game-session', sessionId],
      });
    },
  });
}
