import * as z from 'zod';

const gameSessionIdSchema = z.string().uuid();
const gameParticipantIdSchema = z.string().uuid();

export const gameQuizSessionPhaseSchema = z.enum([
  'LOBBY',
  'QUESTION_OPEN',
  'REVEAL',
  'SCOREBOARD',
  'FINAL_CELEBRATION',
  'REPORT',
]);

const versionedGameQuizEventSchema = z.object({
  eventId: z.string().uuid(),
  sessionId: gameSessionIdSchema,
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
  participantId: gameParticipantIdSchema,
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
      sessionId: string;
    }
  | {
      kind: 'host';
      sessionId: string;
    }
  | {
      kind: 'player';
      participantId: string;
      sessionId: string;
    };

export function gameQuizSharedChannel(sessionId: string): string {
  return `game:${gameSessionIdSchema.parse(sessionId)}:shared`;
}

export function gameQuizHostChannel(sessionId: string): string {
  return `game:${gameSessionIdSchema.parse(sessionId)}:host`;
}

export function gameQuizPlayerChannel(
  sessionId: string,
  participantId: string
): string {
  return `game:${gameSessionIdSchema.parse(sessionId)}:player:${gameParticipantIdSchema.parse(participantId)}`;
}

export function parseGameQuizRealtimeChannel(
  channel: string
): GameQuizRealtimeChannel | null {
  const parts = channel.split(':');

  if (parts.length === 3 && parts[0] === 'game' && parts[2] === 'shared') {
    const sessionId = gameSessionIdSchema.safeParse(parts[1]);
    return sessionId.success
      ? { kind: 'shared', sessionId: sessionId.data }
      : null;
  }

  if (parts.length === 3 && parts[0] === 'game' && parts[2] === 'host') {
    const sessionId = gameSessionIdSchema.safeParse(parts[1]);
    return sessionId.success
      ? { kind: 'host', sessionId: sessionId.data }
      : null;
  }

  if (parts.length === 4 && parts[0] === 'game' && parts[2] === 'player') {
    const sessionId = gameSessionIdSchema.safeParse(parts[1]);
    const participantId = gameParticipantIdSchema.safeParse(parts[3]);

    if (sessionId.success && participantId.success) {
      return {
        kind: 'player',
        sessionId: sessionId.data,
        participantId: participantId.data,
      };
    }
  }

  return null;
}
