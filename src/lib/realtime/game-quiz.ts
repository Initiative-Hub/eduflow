import 'server-only';

import { Realtime, type InferRealtimeEvents } from '@upstash/realtime';
import * as z from 'zod';
import {
  gameQuizHostProgressEventSchema,
  gameQuizHostChannel,
  gameQuizPlayerChannel,
  gameQuizPlayerEventSchema,
  gameQuizRealtimeEventSchemas,
  gameQuizSharedChannel,
  gameQuizSharedEventSchema,
} from '@/lib/game-quiz/realtime-events';
import { getUpstashRestRedisClient } from '@/lib/upstash/redis/client';

export type GameQuizRealtimeEvents = InferRealtimeEvents<
  ReturnType<typeof getGameQuizRealtime>
>;

export type GameQuizRealtimeEmitResult =
  | { delivered: true }
  | { delivered: false; reason: 'EMIT_FAILED' };

let gameQuizRealtime: Realtime<{
  schema: typeof gameQuizRealtimeEventSchemas;
  redis: ReturnType<typeof getUpstashRestRedisClient>;
  history: {
    expireAfterSecs: number;
    maxLength: number;
  };
}> | null = null;

export function getGameQuizRealtime() {
  gameQuizRealtime ??= new Realtime({
    schema: gameQuizRealtimeEventSchemas,
    redis: getUpstashRestRedisClient(),
    history: {
      maxLength: 200,
      expireAfterSecs: 4 * 60 * 60,
    },
  });

  return gameQuizRealtime;
}

export async function emitGameQuizSharedEvent(input: {
  phase: z.input<typeof gameQuizSharedEventSchema>['phase'];
  sessionId: string;
  stateVersion: number;
}): Promise<GameQuizRealtimeEmitResult> {
  const event = gameQuizSharedEventSchema.parse({
    ...input,
    eventId: crypto.randomUUID(),
    emittedAt: new Date().toISOString(),
  });

  return emitGameQuizEvent(
    gameQuizSharedChannel(event.sessionId),
    'gameQuiz.sharedUpdated',
    event
  );
}

export async function emitGameQuizHostProgressEvent(input: {
  kind: z.input<typeof gameQuizHostProgressEventSchema>['kind'];
  phase: z.input<typeof gameQuizHostProgressEventSchema>['phase'];
  sessionId: string;
  stateVersion: number;
}): Promise<GameQuizRealtimeEmitResult> {
  const event = gameQuizHostProgressEventSchema.parse({
    ...input,
    eventId: crypto.randomUUID(),
    emittedAt: new Date().toISOString(),
  });

  return emitGameQuizEvent(
    gameQuizHostChannel(event.sessionId),
    'gameQuiz.hostProgressUpdated',
    event
  );
}

export async function emitGameQuizPlayerEvent(input: {
  kind: z.input<typeof gameQuizPlayerEventSchema>['kind'];
  participantId: string;
  sessionId: string;
  stateVersion: number;
}): Promise<GameQuizRealtimeEmitResult> {
  const event = gameQuizPlayerEventSchema.parse({
    ...input,
    eventId: crypto.randomUUID(),
    emittedAt: new Date().toISOString(),
  });

  return emitGameQuizEvent(
    gameQuizPlayerChannel(event.sessionId, event.participantId),
    'gameQuiz.playerUpdated',
    event
  );
}

async function emitGameQuizEvent(
  channelName: string,
  eventName:
    | 'gameQuiz.sharedUpdated'
    | 'gameQuiz.hostProgressUpdated'
    | 'gameQuiz.playerUpdated',
  event: unknown
): Promise<GameQuizRealtimeEmitResult> {
  const channel = getGameQuizRealtime().channel(channelName);

  try {
    if (eventName === 'gameQuiz.sharedUpdated') {
      await channel.emit(eventName, gameQuizSharedEventSchema.parse(event));
    } else if (eventName === 'gameQuiz.hostProgressUpdated') {
      await channel.emit(
        eventName,
        gameQuizHostProgressEventSchema.parse(event)
      );
    } else {
      await channel.emit(eventName, gameQuizPlayerEventSchema.parse(event));
    }

    return { delivered: true };
  } catch (error) {
    console.error('Game Quiz Realtime emit failed.', error);
    return { delivered: false, reason: 'EMIT_FAILED' };
  }
}
