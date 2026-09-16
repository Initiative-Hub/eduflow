import * as z from 'zod';

export const liveGameAudienceSchema = z.enum(['HOST', 'PARTICIPANT']);
export type LiveGameAudience = z.infer<typeof liveGameAudienceSchema>;

export const liveGamePhaseSchema = z.enum([
  'LOBBY',
  'QUESTION_OPEN',
  'REVEAL',
  'SCOREBOARD',
  'FINAL_CELEBRATION',
]);

export const liveGameCloseReasonSchema = z.enum([
  'HOST_LEFT',
  'COMPLETED',
  'HOST_ENDED',
]);

const nullableText = z.string().nullable();
const isoDate = z.iso.datetime();

export const runtimeOptionSchema = z.object({
  id: z.uuid(),
  orderIndex: z.number().int().min(0),
  text: z.string(),
  isCorrect: z.boolean(),
});

export const runtimeRoundSchema = z.object({
  id: z.uuid(),
  sourceQuestionId: z.uuid().nullable(),
  orderIndex: z.number().int().min(0),
  prompt: z.string(),
  hint: nullableText,
  explanation: nullableText,
  timerSeconds: z.number().int().positive(),
  maxPoints: z.number().int().positive(),
  openedAt: isoDate.nullable(),
  deadlineAt: isoDate.nullable(),
  revealedAt: isoDate.nullable(),
  options: z.array(runtimeOptionSchema).min(2),
});

export const runtimeParticipantSchema = z.object({
  id: z.uuid(),
  userId: z.uuid().nullable(),
  guestId: z.uuid().nullable().optional(),
  displayName: z.string().trim().min(1).max(80),
  image: z.string().nullable(),
  score: z.number().int().min(0),
  joinedAt: isoDate,
  lastSeenAt: isoDate.nullable(),
});

export const runtimeAnswerSchema = z.object({
  id: z.uuid(),
  participantId: z.uuid(),
  roundId: z.uuid(),
  selectedOptionId: z.uuid(),
  idempotencyKey: z.uuid(),
  submittedAt: isoDate,
  responseTimeMs: z.number().int().min(0),
  isCorrect: z.boolean(),
  pointsAwarded: z.number().int().min(0),
});

export const runtimeSessionSchema = z.object({
  id: z.uuid(),
  gameQuizId: z.uuid(),
  hostId: z.uuid(),
  title: z.string(),
  topic: nullableText,
  difficulty: nullableText,
  joinCode: z.string().regex(/^\d{6}$/),
  phase: liveGamePhaseSchema,
  currentRoundIndex: z.number().int().min(0).nullable(),
  joiningLocked: z.boolean(),
  stateVersion: z.number().int().positive(),
  startedAt: isoDate.nullable(),
  endedAt: isoDate.nullable(),
  closedReason: liveGameCloseReasonSchema.nullable(),
  createdAt: isoDate,
});

export const roomInitializationSchema = z.object({
  type: z.literal('session.initialize'),
  initializationKey: z.uuid(),
  payloadHash: z.string().min(32).max(128),
  session: runtimeSessionSchema,
  rounds: z.array(runtimeRoundSchema).min(1).max(100),
});

export type RoomInitialization = z.infer<typeof roomInitializationSchema>;
export type RuntimeSession = z.infer<typeof runtimeSessionSchema>;
export type RuntimeRound = z.infer<typeof runtimeRoundSchema>;
export type RuntimeParticipant = z.infer<typeof runtimeParticipantSchema>;
export type RuntimeAnswer = z.infer<typeof runtimeAnswerSchema>;

export const liveGameTicketClaimsSchema = z.object({
  iss: z.literal('eduflow-next'),
  aud: z.union([z.literal('eduflow-partykit'), z.array(z.string())]),
  sub: z.uuid(),
  sessionId: z.uuid(),
  audience: liveGameAudienceSchema,
  role: z.string().nullable(),
  identityKind: z.enum(['USER', 'GUEST']).default('USER'),
  guestDisplayName: z.string().trim().min(1).max(80).optional(),
  jti: z.uuid(),
  iat: z.number().int(),
  nbf: z.number().int(),
  exp: z.number().int(),
});

export type LiveGameTicketClaims = z.infer<typeof liveGameTicketClaimsSchema>;

export const hostCommandMessageSchema = z.object({
  type: z.literal('host.command'),
  requestId: z.uuid(),
  expectedStateVersion: z.number().int().positive(),
  action: z.enum(['START', 'SKIP', 'NEXT', 'SET_JOINING_LOCKED', 'END_GAME']),
  joiningLocked: z.boolean().optional(),
});

export const playerAnswerMessageSchema = z.object({
  type: z.literal('player.answer'),
  requestId: z.uuid(),
  roundId: z.uuid(),
  selectedOptionId: z.uuid(),
  idempotencyKey: z.uuid(),
});

export const sessionSyncMessageSchema = z.object({
  type: z.literal('session.sync'),
  requestId: z.uuid(),
  displayName: z.string().trim().min(1).max(80),
  image: z.string().nullable(),
});

export const liveGameClientMessageSchema = z.discriminatedUnion('type', [
  sessionSyncMessageSchema,
  hostCommandMessageSchema,
  playerAnswerMessageSchema,
]);

const projectedOptionSchema = z.object({
  id: z.uuid(),
  text: z.string(),
  isCorrect: z.boolean().optional(),
  order: z.number().int(),
  answerCount: z.number().int().optional(),
  answerers: z
    .array(
      z.object({
        id: z.uuid(),
        displayName: z.string(),
        image: z.string().nullable().optional(),
      })
    )
    .optional(),
});

const projectedRoundSchema = z.object({
  id: z.uuid(),
  order: z.number().int(),
  prompt: z.string(),
  hint: nullableText.optional(),
  explanation: nullableText.optional(),
  timeLimitSeconds: z.number().int().positive(),
  maxPoints: z.number().int().positive(),
  openedAt: isoDate.nullable().optional(),
  deadlineAt: isoDate.nullable().optional(),
  statistics: z
    .object({
      responseCount: z.number().int(),
      correctCount: z.number().int(),
      averageResponseTimeMs: z.number().nullable(),
    })
    .optional(),
  options: z.array(projectedOptionSchema),
});

const projectedParticipantSchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
  image: z.string().nullable().optional(),
  score: z.number().int(),
  isOnline: z.boolean().optional(),
  joinedAt: isoDate.optional(),
});

export const liveGameSnapshotSchema = z.object({
  gameQuizId: z.uuid(),
  gameTitle: z.string(),
  joinCode: z.string(),
  joiningLocked: z.boolean(),
  phase: liveGamePhaseSchema,
  closedReason: liveGameCloseReasonSchema.nullable(),
  endedAt: isoDate.nullable(),
  stateVersion: z.number().int().positive(),
  currentRound: projectedRoundSchema.nullable(),
  currentRoundIndex: z.number().int().min(0),
  totalRounds: z.number().int().min(0),
  participant: projectedParticipantSchema.nullable(),
  participants: z.array(projectedParticipantSchema),
  answerCount: z.number().int().min(0),
  leaderboard: z.array(projectedParticipantSchema),
  myAnswer: z
    .object({
      optionId: z.uuid(),
      isCorrect: z.boolean().optional(),
      pointsAwarded: z.number().int().optional(),
    })
    .nullable(),
});

export type LiveGameSnapshot = z.infer<typeof liveGameSnapshotSchema>;

export const liveGameServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('session.snapshot'),
    snapshot: liveGameSnapshotSchema,
  }),
  z.object({
    type: z.literal('operation.result'),
    requestId: z.uuid(),
    stateVersion: z.number().int().positive(),
  }),
  z.object({ type: z.literal('session.finalizing') }),
  z.object({ type: z.literal('session.finalized') }),
  z.object({
    type: z.literal('error'),
    code: z.string(),
    message: z.string(),
    requestId: z.uuid().optional(),
    stateVersion: z.number().int().positive().optional(),
    retryable: z.boolean(),
  }),
]);

export type LiveGameServerMessage = z.infer<typeof liveGameServerMessageSchema>;

const finalRoundSchema = z.object({
  id: z.uuid(),
  openedAt: isoDate.nullable(),
  deadlineAt: isoDate.nullable(),
  revealedAt: isoDate.nullable(),
});

export const finalizationParticipantSchema = runtimeParticipantSchema.pick({
  id: true,
  userId: true,
  guestId: true,
  displayName: true,
  joinedAt: true,
});

export const finalizationAnswerSchema = runtimeAnswerSchema.pick({
  id: true,
  participantId: true,
  roundId: true,
  selectedOptionId: true,
  idempotencyKey: true,
  submittedAt: true,
  responseTimeMs: true,
});

export const liveGameFinalizationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('BEGIN'),
    sessionId: z.uuid(),
    finalizationId: z.uuid(),
    stateHash: z.string().min(32).max(128),
    expectedParticipantCount: z.number().int().min(0),
    expectedAnswerCount: z.number().int().min(0),
    terminal: z.object({
      phase: z.literal('FINAL_CELEBRATION'),
      closeReason: liveGameCloseReasonSchema,
      currentRoundIndex: z.number().int().min(0).nullable(),
      endedAt: isoDate,
      startedAt: isoDate.nullable(),
      stateVersion: z.number().int().positive(),
      rounds: z.array(finalRoundSchema).max(100),
    }),
  }),
  z.object({
    type: z.literal('PARTICIPANTS'),
    sessionId: z.uuid(),
    finalizationId: z.uuid(),
    chunkIndex: z.number().int().min(0),
    payloadHash: z.string().min(32).max(128),
    items: z.array(finalizationParticipantSchema),
  }),
  z.object({
    type: z.literal('ANSWERS'),
    sessionId: z.uuid(),
    finalizationId: z.uuid(),
    chunkIndex: z.number().int().min(0),
    payloadHash: z.string().min(32).max(128),
    items: z.array(finalizationAnswerSchema),
  }),
  z.object({
    type: z.literal('COMMIT'),
    sessionId: z.uuid(),
    finalizationId: z.uuid(),
    stateHash: z.string().min(32).max(128),
  }),
]);

export type LiveGameFinalization = z.infer<typeof liveGameFinalizationSchema>;
