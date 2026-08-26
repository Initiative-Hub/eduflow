import * as z from 'zod';

const trimmedRequiredText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength);

const generatedOptionSchema = z.object({
  text: trimmedRequiredText(500),
  isCorrect: z.boolean(),
});

export const gameQuizAIGenerationInputSchema = z.object({
  courseId: z.uuid(),
  lessonIds: z
    .array(z.uuid())
    .min(1)
    .max(20)
    .refine((lessonIds) => new Set(lessonIds).size === lessonIds.length, {
      message: 'Lesson IDs must be unique',
    }),
  questionCount: z.number().int().min(1).max(20),
  additionalPrompt: z.string().trim().max(500).optional(),
  topic: z.string().trim().max(120).optional(),
});

export const gameQuizAISourcesResponseSchema = z.object({
  courses: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      modules: z.array(
        z.object({
          id: z.uuid(),
          title: z.string(),
          lessons: z.array(
            z.object({
              id: z.uuid(),
              title: z.string(),
            })
          ),
        })
      ),
    })
  ),
});

export const gameQuizAIGeneratedQuestionSchema = z
  .object({
    prompt: trimmedRequiredText(10_000),
    hint: trimmedRequiredText(1_000),
    explanation: trimmedRequiredText(4_000),
    timerSeconds: z.number().int().min(5).max(300),
    maxPoints: z.number().int().min(1).max(10_000),
    options: z.array(generatedOptionSchema).min(2).max(4),
  })
  .superRefine((question, ctx) => {
    if (question.options.filter(({ isCorrect }) => isCorrect).length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Each question must have exactly one correct option',
        path: ['options'],
      });
    }
  });

export const gameQuizAIGenerationResponseSchema = z.object({
  questions: z.array(gameQuizAIGeneratedQuestionSchema).min(1).max(20),
});

export type GameQuizAIGenerationInput = z.infer<
  typeof gameQuizAIGenerationInputSchema
>;
export type GameQuizAISourcesResponse = z.infer<
  typeof gameQuizAISourcesResponseSchema
>;
export type GameQuizAIGenerationResponse = z.infer<
  typeof gameQuizAIGenerationResponseSchema
>;
export type GameQuizAIGeneratedQuestion = z.infer<
  typeof gameQuizAIGeneratedQuestionSchema
>;
