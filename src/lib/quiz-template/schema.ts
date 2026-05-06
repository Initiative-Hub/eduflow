import { z } from 'zod';

// ─── Metadata & Constraints ─────────────────────────────────────────────────

export const templateMetadataSchema = z.object({
  difficultyLevel: z.enum(['easy', 'medium', 'hard']),
  subjectArea: z.string().min(1),
  targetGradeLevel: z.string().min(1),
});

export const templateConstraintsSchema = z.object({
  minQuestions: z.number().int().min(1),
  maxQuestions: z.number().int().min(1),
  timeLimitSeconds: z.number().int().positive().optional(),
  pointsPerQuestion: z.number().positive(),
});

export const scoringConfigSchema = z.object({
  pointsPerQuestion: z.number().positive(),
  passingPercentage: z.number().min(0).max(100).optional(),
  showCorrectAnswers: z.boolean(),
  showExplanations: z.boolean(),
});

// ─── Answer Option ───────────────────────────────────────────────────────────

export const answerOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

// ─── Question Block Schemas ──────────────────────────────────────────────────

export const multipleChoiceQuestionSchema = z
  .object({
    type: z.literal('multiple-choice'),
    prompt: z.string().min(1),
    options: z.array(answerOptionSchema).min(2).max(6),
    explanation: z.string().optional(),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect).length === 1, {
    message: 'Multiple-choice must have exactly one correct option',
  });

export const trueFalseQuestionSchema = z.object({
  type: z.literal('true-false'),
  prompt: z.string().min(1),
  correctAnswer: z.boolean(),
  explanation: z.string().optional(),
});

export const fillInTheBlankQuestionSchema = z
  .object({
    type: z.literal('fill-in-the-blank'),
    promptTemplate: z.string().min(1),
    blanks: z
      .array(
        z.object({
          id: z.string().min(1),
          acceptableAnswers: z.array(z.string().min(1)).min(1),
        })
      )
      .min(1),
    explanation: z.string().optional(),
  })
  .refine(
    (q) => {
      const placeholderMatches = q.promptTemplate.match(/\{\{(\w+)\}\}/g);
      if (!placeholderMatches) return false;
      const placeholderIds = placeholderMatches.map((m) =>
        m.replace(/\{\{|\}\}/g, '')
      );
      const blankIds = q.blanks.map((b) => b.id);
      return (
        placeholderIds.length === blankIds.length &&
        placeholderIds.every((id) => blankIds.includes(id))
      );
    },
    {
      message:
        'Every placeholder in promptTemplate must have a corresponding blank entry',
    }
  );

export const matchingQuestionSchema = z
  .object({
    type: z.literal('matching'),
    prompt: z.string().min(1),
    leftItems: z
      .array(z.object({ id: z.string().min(1), text: z.string().min(1) }))
      .min(2),
    rightItems: z
      .array(z.object({ id: z.string().min(1), text: z.string().min(1) }))
      .min(2),
    correctPairs: z
      .array(
        z.object({
          leftId: z.string().min(1),
          rightId: z.string().min(1),
        })
      )
      .min(2),
    explanation: z.string().optional(),
  })
  .refine((q) => q.leftItems.length === q.rightItems.length, {
    message: 'Matching question must have equal-length left and right lists',
  })
  .refine(
    (q) => {
      const leftIds = q.leftItems.map((i) => i.id);
      const rightIds = q.rightItems.map((i) => i.id);
      return q.correctPairs.every(
        (p) => leftIds.includes(p.leftId) && rightIds.includes(p.rightId)
      );
    },
    {
      message:
        'All correctPairs must reference valid leftItem and rightItem IDs',
    }
  );

export const orderingQuestionSchema = z
  .object({
    type: z.literal('ordering'),
    prompt: z.string().min(1),
    items: z
      .array(z.object({ id: z.string().min(1), text: z.string().min(1) }))
      .min(2),
    correctOrder: z.array(z.string().min(1)).min(2),
    explanation: z.string().optional(),
  })
  .refine(
    (q) => {
      const itemIds = [...q.items.map((i) => i.id)].sort();
      const orderIds = [...q.correctOrder].sort();
      return (
        itemIds.length === orderIds.length &&
        itemIds.every((id, idx) => id === orderIds[idx])
      );
    },
    {
      message:
        'correctOrder must be a permutation of item IDs (same elements, no duplicates)',
    }
  );

export const flashcardQuestionSchema = z.object({
  type: z.literal('flashcard'),
  front: z.string().min(1),
  back: z.string().min(1),
});

export const dragAndDropQuestionSchema = z.object({
  type: z.literal('drag-and-drop'),
  prompt: z.string().min(1),
  draggables: z
    .array(z.object({ id: z.string().min(1), text: z.string().min(1) }))
    .min(1),
  dropZones: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        acceptsIds: z.array(z.string().min(1)).min(1),
      })
    )
    .min(1),
  explanation: z.string().optional(),
});

// ─── Base Question Block (without timed-challenge for inner use) ─────────────

const baseQuestionBlockSchema = z.discriminatedUnion('type', [
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  fillInTheBlankQuestionSchema,
  matchingQuestionSchema,
  orderingQuestionSchema,
  flashcardQuestionSchema,
  dragAndDropQuestionSchema,
]);

export const timedChallengeQuestionSchema = z.object({
  type: z.literal('timed-challenge'),
  timeLimitSeconds: z.number().int().positive(),
  innerQuestion: baseQuestionBlockSchema,
});

// ─── Full Question Block (discriminated union of all types) ──────────────────

export const questionBlockSchema = z.discriminatedUnion('type', [
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  fillInTheBlankQuestionSchema,
  matchingQuestionSchema,
  orderingQuestionSchema,
  flashcardQuestionSchema,
  dragAndDropQuestionSchema,
  timedChallengeQuestionSchema,
]);

// ─── Template Schema (top-level) ────────────────────────────────────────────

export const templateSchemaValidator = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  type: z.enum([
    'multiple-choice',
    'true-false',
    'fill-in-the-blank',
    'matching',
    'ordering',
    'flashcard',
    'drag-and-drop',
    'timed-challenge',
  ]),
  metadata: templateMetadataSchema,
  constraints: templateConstraintsSchema,
  questions: z.array(questionBlockSchema).min(1),
  scoring: scoringConfigSchema,
});

// ─── Student Answer Schemas ──────────────────────────────────────────────────

const multipleChoiceAnswerSchema = z.object({
  type: z.literal('multiple-choice'),
  selectedOptionId: z.string().min(1),
});

const trueFalseAnswerSchema = z.object({
  type: z.literal('true-false'),
  selectedAnswer: z.boolean(),
});

const fillInTheBlankAnswerSchema = z.object({
  type: z.literal('fill-in-the-blank'),
  filledBlanks: z.record(z.string(), z.string()),
});

const matchingAnswerSchema = z.object({
  type: z.literal('matching'),
  pairs: z
    .array(
      z.object({
        leftId: z.string().min(1),
        rightId: z.string().min(1),
      })
    )
    .min(1),
});

const orderingAnswerSchema = z.object({
  type: z.literal('ordering'),
  orderedItemIds: z.array(z.string().min(1)).min(1),
});

const dragAndDropAnswerSchema = z.object({
  type: z.literal('drag-and-drop'),
  placements: z
    .array(
      z.object({
        draggableId: z.string().min(1),
        dropZoneId: z.string().min(1),
      })
    )
    .min(1),
});

export const studentAnswerSchema = z.discriminatedUnion('type', [
  multipleChoiceAnswerSchema,
  trueFalseAnswerSchema,
  fillInTheBlankAnswerSchema,
  matchingAnswerSchema,
  orderingAnswerSchema,
  dragAndDropAnswerSchema,
]);
