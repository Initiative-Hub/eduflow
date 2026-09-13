import * as z from 'zod';

const multipleChoiceAnswerSchema = z.object({
  type: z.literal('multiple_choice'),
  selectedOptionId: z.string(),
});

const trueFalseAnswerSchema = z.object({
  type: z.literal('true_false'),
  selectedAnswer: z.boolean(),
});

const fillInTheBlankAnswerSchema = z.object({
  type: z.literal('fill_in_the_blank'),
  filledBlanks: z.record(z.string(), z.string()),
});

const matchingPairSchema = z.object({
  leftId: z.string(),
  rightId: z.string(),
});

const matchingAnswerSchema = z.object({
  type: z.literal('matching'),
  pairs: z.array(matchingPairSchema),
});

const orderingAnswerSchema = z.object({
  type: z.literal('ordering'),
  orderedItemIds: z.array(z.string()),
});

const dragAndDropAnswerSchema = z.object({
  type: z.literal('drag_and_drop'),
  placements: z.record(z.string(), z.string()),
});

const essayAnswerSchema = z.object({
  type: z.literal('essay'),
  text: z.string(),
  attachments: z.array(z.string()).optional(),
  teacherRubricText: z.string().optional(),
  teacherRubricAttachments: z.array(z.string()).optional(),
});

export const studentAnswerSchema = z.discriminatedUnion('type', [
  multipleChoiceAnswerSchema,
  trueFalseAnswerSchema,
  fillInTheBlankAnswerSchema,
  matchingAnswerSchema,
  orderingAnswerSchema,
  dragAndDropAnswerSchema,
  essayAnswerSchema,
]);

export const attemptIdParamsSchema = z.object({ attemptId: z.uuid() });
export const quizAttemptQuizParamsSchema = z.object({ quizId: z.uuid() });
export const attemptProgressSchema = z.object({
  revision: z.number().int().nonnegative(),
  currentQuestionIndex: z.number().int().nonnegative(),
  answers: z.record(z.string().regex(/^(0|[1-9]\d*)$/), studentAnswerSchema),
});
export const attemptCheckSchema = z.object({
  revision: z.number().int().nonnegative(),
  questionIndex: z.number().int().nonnegative(),
  answer: studentAnswerSchema,
});
export const attemptCompleteSchema = z.object({
  revision: z.number().int().nonnegative(),
});
export type AttemptProgress = z.infer<typeof attemptProgressSchema>;
export type AttemptCheck = z.infer<typeof attemptCheckSchema>;
export type AttemptComplete = z.infer<typeof attemptCompleteSchema>;
