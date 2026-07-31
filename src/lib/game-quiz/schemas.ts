import * as z from 'zod';
import { GAME_QUIZ_TEMPLATE_KEY, GAME_SESSION_PHASES } from './types';

const trimmedText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength);

const nullableTrimmedText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const gameQuizIdParamsSchema = z.object({
  gameQuizId: z.uuid(),
});

export const gameSessionIdParamsSchema = z.object({
  sessionId: z.uuid(),
});

export const gameQuizSettingsSchema = z.object({
  title: trimmedText(160),
  topic: nullableTrimmedText(120),
  difficulty: nullableTrimmedText(50),
  randomizeQuestionOrder: z.boolean().default(false),
  randomizeAnswerOrder: z.boolean().default(false),
  showLeaderboard: z.boolean().default(false),
});

export const createGameQuizSchema = gameQuizSettingsSchema;

export const updateGameQuizSchema = gameQuizSettingsSchema
  .partial()
  .extend({ expectedRevision: z.number().int().min(1) })
  .refine(
    ({
      title,
      topic,
      difficulty,
      randomizeQuestionOrder,
      randomizeAnswerOrder,
      showLeaderboard,
    }) =>
      title !== undefined ||
      topic !== undefined ||
      difficulty !== undefined ||
      randomizeQuestionOrder !== undefined ||
      randomizeAnswerOrder !== undefined ||
      showLeaderboard !== undefined,
    { message: 'At least one field must be updated' }
  );

export const gameQuizOptionSchema = z.object({
  text: trimmedText(500),
  isCorrect: z.boolean(),
});

export const gameQuizQuestionSchema = z
  .object({
    prompt: trimmedText(10_000),
    hint: nullableTrimmedText(1_000),
    explanation: nullableTrimmedText(4_000),
    timerSeconds: z.number().int().min(5).max(300),
    maxPoints: z.number().int().min(1).max(10_000),
    options: z.array(gameQuizOptionSchema).min(2).max(4),
  })
  .superRefine((question, ctx) => {
    const correctCount = question.options.filter(
      (option) => option.isCorrect
    ).length;
    if (correctCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Each question must have exactly one correct option',
        path: ['options'],
      });
    }
  });

export const saveGameQuizQuestionsSchema = z.object({
  expectedRevision: z.number().int().min(1),
  settings: gameQuizSettingsSchema,
  questions: z.array(gameQuizQuestionSchema).min(1).max(100),
});

export const createGameSessionSchema = z.object({
  expectedRevision: z.number().int().min(1),
});

export const joinGameSessionSchema = z.object({
  joinCode: z.string().regex(/^\d{6}$/, 'Join code must contain six digits'),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const hostCommandSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('START'),
    expectedStateVersion: z.number().int().min(1),
  }),
  z.object({
    action: z.literal('LOCK_ANSWERS'),
    expectedStateVersion: z.number().int().min(1),
  }),
  z.object({
    action: z.literal('REVEAL'),
    expectedStateVersion: z.number().int().min(1),
  }),
  z.object({
    action: z.literal('SHOW_PROGRESS'),
    expectedStateVersion: z.number().int().min(1),
  }),
  z.object({
    action: z.literal('OPEN_NEXT'),
    expectedStateVersion: z.number().int().min(1),
  }),
  z.object({
    action: z.literal('SET_JOINING_LOCKED'),
    expectedStateVersion: z.number().int().min(1),
    joiningLocked: z.boolean(),
  }),
  z.object({
    action: z.literal('END'),
    expectedStateVersion: z.number().int().min(1),
  }),
]);

export const submitGameAnswerSchema = z.object({
  roundId: z.uuid(),
  selectedOptionId: z.uuid(),
  idempotencyKey: z.uuid(),
});

export const gameSessionPhaseSchema = z.enum(GAME_SESSION_PHASES);

export type CreateGameQuizInput = z.infer<typeof createGameQuizSchema>;
export type UpdateGameQuizInput = z.infer<typeof updateGameQuizSchema>;
export type SaveGameQuizQuestionsInput = z.infer<
  typeof saveGameQuizQuestionsSchema
>;
export type CreateGameSessionInput = z.infer<typeof createGameSessionSchema>;
export type JoinGameSessionInput = z.infer<typeof joinGameSessionSchema>;
export type HostCommandInput = z.infer<typeof hostCommandSchema>;
export type SubmitGameAnswerInput = z.infer<typeof submitGameAnswerSchema>;

export { GAME_QUIZ_TEMPLATE_KEY };
