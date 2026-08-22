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
  audience,
  realtimeKey,
  participantRealtimeKey,
  queryKey,
}: {
  audience: 'HOST' | 'PARTICIPANT';
  realtimeKey?: string;
  participantRealtimeKey?: string;
  queryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const channels = realtimeKey
    ? [
        gameQuizSharedChannel(realtimeKey),
        audience === 'HOST' ? gameQuizHostChannel(realtimeKey) : undefined,
        audience === 'PARTICIPANT' && participantRealtimeKey
          ? gameQuizPlayerChannel(participantRealtimeKey)
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
    enabled: Boolean(realtimeKey),
    onData: () => {
      void queryClient.invalidateQueries({
        queryKey,
      });
    },
  });
}
