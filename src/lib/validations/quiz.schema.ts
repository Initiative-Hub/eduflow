import { z } from 'zod';

// Define the root Quiz structure schema wrapper
export const createQuizSchema = (questionSchema: z.ZodTypeAny) =>
  z.object({
    title: z.string().describe('An engaging, descriptive title for the quiz'),
    description: z.string().describe('A summary of what this quiz will test'),
    category: z
      .enum(['SELECTION_BASED', 'OPEN_ENDED'])
      .describe('Category of the quiz'),
    subType: z
      .enum([
        'MULTIPLE_CHOICE',
        'TRUE_FALSE',
        'MATCHING',
        'ORDERING',
        'ESSAY',
        'FILL_IN_THE_BLANK',
        'DRAG_AND_DROP',
      ])
      .describe('The subType/format of questions in this quiz'),
    deliveryMode: z
      .enum(['INSTANT_FEEDBACK', 'POST_QUIZ_REVIEW'])
      .describe('How feedback is delivered to the student'),
    selectionMethod: z
      .enum(['HAND_PICK', 'RANDOM', 'MANUAL_CREATE'])
      .describe('Method used to select questions'),
    questionCount: z
      .number()
      .int()
      .describe('Total number of questions in the quiz'),
    questions: z
      .array(questionSchema)
      .describe('The list of generated questions'),
  });

// 1. Multiple Choice Question Schema
export const multipleChoiceQuestionSchema = z.object({
  type: z.literal('multiple_choice'),
  prompt: z.string().describe('The question text or prompt'),
  options: z
    .array(
      z.object({
        id: z
          .string()
          .describe('Unique ID for this option (e.g. "opt1", "opt2")'),
        text: z.string().describe('Option text'),
        isCorrect: z
          .boolean()
          .describe('Whether this option is the correct answer'),
      })
    )
    .min(2)
    .max(6)
    .describe('List of multiple choice options (exactly one must be correct)'),
  explanation: z
    .string()
    .optional()
    .describe('Brief explanation of why the correct option is correct'),
});

// 2. True/False Question Schema
export const trueFalseQuestionSchema = z.object({
  type: z.literal('true_false'),
  prompt: z.string().describe('The question text or prompt'),
  correctAnswer: z.boolean().describe('The correct answer (true or false)'),
  explanation: z
    .string()
    .optional()
    .describe('Brief explanation of why the answer is true or false'),
});

// 3. Fill in the Blank Question Schema
export const fillInTheBlankQuestionSchema = z.object({
  type: z.literal('fill_in_the_blank'),
  promptTemplate: z
    .string()
    .describe(
      'Sentence template with blanks denoted by {{blankId}} placeholders (e.g., "The capital of France is {{blank1}}.")'
    ),
  blanks: z
    .array(
      z.object({
        id: z
          .string()
          .describe('ID matching the template placeholder (e.g. "blank1")'),
        acceptableAnswers: z
          .array(z.string())
          .describe('Acceptable correct answers (case-insensitive)'),
      })
    )
    .describe('List of blanks in the template'),
  explanation: z.string().optional().describe('Explanation of correct answer'),
});

// 4. Matching Question Schema
export const matchingQuestionSchema = z.object({
  type: z.literal('matching'),
  prompt: z.string().describe('Prompt introducing matching challenge'),
  leftItems: z.array(
    z.object({
      id: z.string().describe('Unique ID for the left item (e.g. "left1")'),
      text: z.string().describe('Left item text'),
    })
  ),
  rightItems: z.array(
    z.object({
      id: z.string().describe('Unique ID for the right item (e.g. "right1")'),
      text: z.string().describe('Right item text'),
    })
  ),
  correctPairs: z
    .array(
      z.object({
        leftId: z.string().describe('The ID of the left item'),
        rightId: z.string().describe('The ID of the matching right item'),
      })
    )
    .describe('List of matching pairs between left and right items'),
  explanation: z.string().optional().describe('Explanation of correct matches'),
});

// 5. Ordering Question Schema
export const orderingQuestionSchema = z.object({
  type: z.literal('ordering'),
  prompt: z.string().describe('Prompt instructing what to order'),
  items: z
    .array(
      z.object({
        id: z.string().describe('Unique ID for this item (e.g. "item1")'),
        text: z.string().describe('Item text'),
      })
    )
    .describe('List of items to be ordered'),
  correctOrder: z
    .array(z.string())
    .describe('List of item IDs in the correct order'),
  explanation: z
    .string()
    .optional()
    .describe('Explanation of correct ordering'),
});

// 6. Drag and Drop Question Schema
export const dragAndDropQuestionSchema = z.object({
  type: z.literal('drag_and_drop'),
  prompt: z.string().describe('Prompt for drag and drop'),
  sentenceTemplate: z
    .string()
    .describe('Sentence template with {{zoneId}} placeholders'),
  zones: z.array(
    z.object({
      id: z
        .string()
        .describe(
          'The ID of the drop zone matching the template placeholder (e.g. "zone1")'
        ),
      label: z.string().describe('Label or hint for this zone'),
    })
  ),
  items: z.array(
    z.object({
      id: z
        .string()
        .describe('Unique ID for the draggable item (e.g. "item1")'),
      text: z.string().describe('Draggable item text'),
    })
  ),
  correctMapping: z
    .record(z.string(), z.string())
    .describe('Correct mapping from zoneId to itemId'),
  explanation: z
    .string()
    .optional()
    .describe('Explanation of the correct mapping'),
});

// 7. Essay Question Schema
export const essayQuestionSchema = z.object({
  type: z.literal('essay'),
  prompt: z.string().describe('The essay prompt or question'),
  rubric: z
    .array(
      z.object({
        id: z.string().describe('Unique ID for this criterion (e.g. "crit1")'),
        label: z.string().describe('Name of the criterion (e.g. "Grammar")'),
        description: z
          .string()
          .describe('Detailed description of what is expected'),
        maxPoints: z
          .number()
          .int()
          .describe('Maximum points for this criterion'),
      })
    )
    .optional()
    .describe('Rubric criteria for grading the essay'),
  minWords: z.number().int().optional().describe('Minimum word count'),
  maxWords: z.number().int().optional().describe('Maximum word count'),
  allowAttachments: z
    .boolean()
    .optional()
    .describe('Whether file attachments are allowed'),
  deliveryOption: z
    .enum(['immediate', 'teacher-review'])
    .optional()
    .describe('How AI feedback is delivered'),
  allowTeacherRubric: z
    .boolean()
    .optional()
    .describe('Whether custom teacher rubrics are allowed'),
  explanation: z
    .string()
    .optional()
    .describe('Explanation or model answer guidelines'),
});

// 8. Timed Challenge Question Schema
export const timedChallengeQuestionSchema = z.object({
  type: z.literal('timed_challenge'),
  prompt: z
    .string()
    .describe('The prompt or introduction of the timed challenge'),
  timeLimitSeconds: z.number().int().describe('Time limit in seconds'),
  innerQuestion: z
    .object({
      type: z.enum(['multiple_choice', 'true_false']),
      prompt: z.string().describe('The question text or prompt'),
      options: z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
            isCorrect: z.boolean(),
          })
        )
        .optional()
        .describe(
          'Only for multiple_choice inner questions (exactly one correct)'
        ),
      correctAnswer: z
        .boolean()
        .optional()
        .describe('Only for true_false inner questions'),
    })
    .describe('The question wrapped by the timed challenge'),
  explanation: z
    .string()
    .optional()
    .describe('Brief explanation of the answer'),
});
