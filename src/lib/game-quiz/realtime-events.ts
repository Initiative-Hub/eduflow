import * as z from 'zod';

const realtimeKeySchema = z.string().min(1).max(128);

export const gameQuizSessionPhaseSchema = z.enum([
  'LOBBY',
  'QUESTION_OPEN',
  'REVEAL',
  'SCOREBOARD',
  'FINAL_CELEBRATION',
]);

const versionedGameQuizEventSchema = z.object({
  eventId: z.string().uuid(),
  stateVersion: z.number().int().nonnegative(),
  emittedAt: z.string().datetime(),
});

export const gameQuizSharedEventSchema = versionedGameQuizEventSchema.extend({
  phase: gameQuizSessionPhaseSchema,
});

export const gameQuizHostProgressEventSchema =
  versionedGameQuizEventSchema.extend({
    phase: gameQuizSessionPhaseSchema,
    kind: z.enum(['ROSTER_CHANGED', 'ANSWER_PROGRESS_CHANGED']),
  });

export const gameQuizPlayerEventSchema = versionedGameQuizEventSchema.extend({
  kind: z.enum(['ANSWER_SUBMITTED', 'ANSWER_RESULT_READY']),
});

export const gameQuizRealtimeEventSchemas = {
  gameQuiz: {
    sharedUpdated: gameQuizSharedEventSchema,
    hostProgressUpdated: gameQuizHostProgressEventSchema,
    playerUpdated: gameQuizPlayerEventSchema,
  },
};

export type GameQuizSessionPhase = z.infer<typeof gameQuizSessionPhaseSchema>;
export type GameQuizSharedEvent = z.infer<typeof gameQuizSharedEventSchema>;
export type GameQuizHostProgressEvent = z.infer<
  typeof gameQuizHostProgressEventSchema
>;
export type GameQuizPlayerEvent = z.infer<typeof gameQuizPlayerEventSchema>;

export type GameQuizRealtimeChannel =
  | {
      kind: 'shared';
      realtimeKey: string;
    }
  | {
      kind: 'host';
      realtimeKey: string;
    }
  | {
      kind: 'player';
      participantRealtimeKey: string;
    };

export function gameQuizSharedChannel(realtimeKey: string): string {
  return `game:${realtimeKeySchema.parse(realtimeKey)}:shared`;
}

export function gameQuizHostChannel(realtimeKey: string): string {
  return `game:${realtimeKeySchema.parse(realtimeKey)}:host`;
}

export function gameQuizPlayerChannel(participantRealtimeKey: string): string {
  return `game-player:${realtimeKeySchema.parse(participantRealtimeKey)}`;
}

export function parseGameQuizRealtimeChannel(
  channel: string
): GameQuizRealtimeChannel | null {
  const parts = channel.split(':');

  if (parts.length === 3 && parts[0] === 'game' && parts[2] === 'shared') {
    const realtimeKey = realtimeKeySchema.safeParse(parts[1]);
    return realtimeKey.success
      ? { kind: 'shared', realtimeKey: realtimeKey.data }
      : null;
  }

  if (parts.length === 3 && parts[0] === 'game' && parts[2] === 'host') {
    const realtimeKey = realtimeKeySchema.safeParse(parts[1]);
    return realtimeKey.success
      ? { kind: 'host', realtimeKey: realtimeKey.data }
      : null;
  }

  if (parts.length === 2 && parts[0] === 'game-player') {
    const participantRealtimeKey = realtimeKeySchema.safeParse(parts[1]);
    if (participantRealtimeKey.success) {
      return {
        kind: 'player',
        participantRealtimeKey: participantRealtimeKey.data,
      };
    }
  }

  return null;
}
