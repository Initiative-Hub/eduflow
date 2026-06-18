import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  generateText,
  Output,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import type { QuizContent } from '@/lib/quiz-template';
import {
  fillInTheBlankQuestionSchema,
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
} from '@/lib/validations/quiz.schema';
import {
  DEFAULT_STUDY_QUIZ_OPTIONS,
  type StudyQuizOptions,
  type StudyQuizQuestionType,
} from '@/lib/validations/study.schema';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';
import type { StreamChatInput } from '@/services/ai/chat-provider.types';

const DEFAULT_PRACTICE_QUIZ_COUNTS: Record<StudyQuizQuestionType, number> = {
  multiple_choice: 5,
  true_false: 3,
  fill_in_the_blank: 2,
};

const aiPracticeQuizSchema = z.object({
  title: z.string(),
  description: z.string(),
  multipleChoice: z
    .array(multipleChoiceQuestionSchema.omit({ type: true }))
    .length(5),
  trueFalse: z.array(trueFalseQuestionSchema.omit({ type: true })).length(3),
  fillInTheBlank: z
    .array(fillInTheBlankQuestionSchema.omit({ type: true }))
    .length(2),
});
type AiPracticeQuiz = z.infer<typeof aiPracticeQuizSchema>;

export function createPracticeQuizCounts(
  options: StudyQuizOptions = DEFAULT_STUDY_QUIZ_OPTIONS
): Record<StudyQuizQuestionType, number> {
  const selected = options.questionTypes;
  const total = options.questionCount;

  if (
    total === 10 &&
    selected.length === 3 &&
    selected.every((type) =>
      DEFAULT_STUDY_QUIZ_OPTIONS.questionTypes.includes(type)
    )
  )
    return DEFAULT_PRACTICE_QUIZ_COUNTS;

  const counts = {
    multiple_choice: 0,
    true_false: 0,
    fill_in_the_blank: 0,
  };

  selected.forEach((type, index) => {
    counts[type] =
      Math.floor(total / selected.length) +
      (index < total % selected.length ? 1 : 0);
  });

  return counts;
}

function createAiPracticeQuizSchema(
  counts: Record<StudyQuizQuestionType, number>
) {
  return z.object({
    title: z.string(),
    description: z.string(),
    multipleChoice: z
      .array(multipleChoiceQuestionSchema.omit({ type: true }))
      .length(counts.multiple_choice),
    trueFalse: z
      .array(trueFalseQuestionSchema.omit({ type: true }))
      .length(counts.true_false),
    fillInTheBlank: z
      .array(fillInTheBlankQuestionSchema.omit({ type: true }))
      .length(counts.fill_in_the_blank),
  });
}

export function buildPracticeQuizContent(output: AiPracticeQuiz): QuizContent {
  return {
    title: output.title,
    description: output.description,
    type: 'practice_test',
    questions: [
      ...output.multipleChoice.map((question) => ({
        type: 'multiple_choice' as const,
        ...question,
      })),
      ...output.trueFalse.map((question) => ({
        type: 'true_false' as const,
        ...question,
      })),
      ...output.fillInTheBlank.map((question) => ({
        type: 'fill_in_the_blank' as const,
        ...question,
      })),
    ],
  };
}

export async function generatePracticeQuiz({
  messages,
  model,
  apiKey,
  providerOptions,
  quizOptions,
}: {
  messages: UIMessage[];
  model?: string;
  apiKey?: string;
  providerOptions?: StreamChatInput['providerOptions'];
  quizOptions?: StudyQuizOptions;
}): Promise<QuizContent> {
  const resolvedApiKey = apiKey ?? process.env.OPENROUTER_API_KEY;

  if (!resolvedApiKey)
    throw new Error('Missing API key for provider "openrouter"');

  const provider = createOpenRouter({ apiKey: resolvedApiKey });

  const counts = createPracticeQuizCounts(quizOptions);
  const questionTotal = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0
  );
  const aiPracticeQuizSchema = createAiPracticeQuizSchema(counts);

  const result = await generateText({
    model: provider(model ?? DEFAULT_MODELS.openrouter),
    output: Output.object({
      schema: aiPracticeQuizSchema,
      name: 'practiceQuiz',
      description: 'A mixed interactive practice quiz for self-study.',
    }),
    system: `
You are EduFlow's Study Assistant. Generate a self-study interactive quiz from the learner's latest message and attached materials.

Rules:
- Generate exactly ${questionTotal} questions.
- Use exactly ${counts.multiple_choice} multiple choice, ${counts.true_false} true/false, and ${counts.fill_in_the_blank} fill-in-the-blank questions.
- Return empty arrays for question types with a count of 0.
- Every multiple choice question must have exactly 4 options and exactly 1 correct option.
- Fill-in-the-blank templates must use {{blankId}} placeholders matching the blanks array.
- Explanations must teach the concept, not only reveal the answer.
- Match the learner's language when possible.
- Do not include essay or short-answer questions.
`,
    messages: await convertToModelMessages(messages),
    providerOptions,
  });

  return buildPracticeQuizContent(result.output);
}
