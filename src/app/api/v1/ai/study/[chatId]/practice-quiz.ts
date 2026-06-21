import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  generateText,
  Output,
  stepCountIs,
  type ToolSet,
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
  studyQuizQuestionTypeSchema,
} from '@/lib/validations/study.schema';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';

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

const quizIntentSchema = z.object({
  hasExplicitQuizOptions: z.boolean(),
  questionCount: z.number().int().min(1).max(30).nullable(),
  questionTypes: z.array(studyQuizQuestionTypeSchema).min(1).nullable(),
});
type QuizIntent = z.infer<typeof quizIntentSchema>;

function getLatestUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== 'user') continue;

    return message.parts
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join(' ')
      .trim();
  }
  return '';
}

function mergeQuizIntentWithOptions({
  intent,
  quizOptions,
}: {
  intent: QuizIntent;
  quizOptions?: StudyQuizOptions;
}): StudyQuizOptions {
  const baseOptions = quizOptions ?? DEFAULT_STUDY_QUIZ_OPTIONS;

  if (
    !intent.hasExplicitQuizOptions ||
    (!intent.questionCount && !intent.questionTypes)
  ) {
    return baseOptions;
  }

  return {
    questionCount: intent.questionCount ?? baseOptions.questionCount,
    questionTypes: intent.questionTypes ?? baseOptions.questionTypes,
  };
}

async function extractPracticeQuizIntent({
  latestUserText,
  provider,
  model,
}: {
  latestUserText: string;
  provider: ReturnType<typeof createOpenRouter>;
  model?: string;
}): Promise<QuizIntent> {
  if (!latestUserText) {
    return {
      hasExplicitQuizOptions: false,
      questionCount: null,
      questionTypes: null,
    };
  }

  const result = await generateText({
    model: provider(model ?? DEFAULT_MODELS.openrouter),
    output: Output.object({
      schema: quizIntentSchema,
      name: 'practiceQuizIntent',
      description:
        'Explicit practice quiz question count and question type instructions.',
    }),
    system: `
You extract explicit quiz configuration from the learner's latest message.
Allowed questionTypes:
- multiple_choice
- true_false
- fill_in_the_blank

Rules:
- Set hasExplicitQuizOptions to true only if the learner clearly asks for a question count or question type.
- If the learner asks for "multiple choice", use "multiple_choice".
- If the learner asks for "true false", "true/false", "true or false", or "yes/no style", use "true_false".
- If the learner asks for "fill in the blank", "fill blanks", or "blank questions", use "fill_in_the_blank".
- If the learner does not specify a count, return questionCount: null.
- If the learner does not specify question types, return questionTypes: null.
- Do not infer a quiz type from the old chat history. Only inspect the latest message.`,
    prompt: latestUserText,
  });

  return result.output;
}

export async function resolvePracticeQuizOptions({
  messages,
  quizOptions,
  provider,
  model,
}: {
  messages: UIMessage[];
  quizOptions?: StudyQuizOptions;
  provider: ReturnType<typeof createOpenRouter>;
  model?: string;
}) {
  const latestUserText = getLatestUserText(messages);
  let intent: QuizIntent;

  try {
    intent = await extractPracticeQuizIntent({
      latestUserText,
      provider,
      model,
    });
  } catch {
    intent = {
      hasExplicitQuizOptions: false,
      questionCount: null,
      questionTypes: null,
    };
  }

  return mergeQuizIntentWithOptions({ intent, quizOptions });
}

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
  quizOptions,
  tools,
  maxSteps,
}: {
  messages: UIMessage[];
  model?: string;
  apiKey?: string;
  quizOptions?: StudyQuizOptions;
  tools: ToolSet;
  maxSteps?: number;
}): Promise<QuizContent> {
  const resolvedApiKey = apiKey ?? process.env.OPENROUTER_API_KEY;

  if (!resolvedApiKey)
    throw new Error('Missing API key for provider "openrouter"');

  const provider = createOpenRouter({ apiKey: resolvedApiKey });

  const resolvedQuizOptions = await resolvePracticeQuizOptions({
    messages,
    quizOptions,
    provider,
    model,
  });
  const counts = createPracticeQuizCounts(resolvedQuizOptions);

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
      
      You may have access to two course tools: \`getEnrolledCourses\` and \`searchLessonContent\`.
      - Tool-use rule: save time by default. Do not call course tools just because the tools are available.
      - ONLY call these tools when the learner explicitly asks for EduFlow course context, enrolled courses, lesson content, class materials, saved coursework, or asks a question that clearly depends on content inside their EduFlow lessons.
      - Use \`getEnrolledCourses\` only when you need to know which course(s) the learner is taking before answering or before narrowing a lesson search.
      - Use \`searchLessonContent\` only when the answer needs relevant excerpts from EduFlow lesson material, or when the learner asks to search, summarize, quiz, explain, compare, or cite their course/lesson content.
      - MUST NOT call these tools for generic teaching, examples, brainstorming, writing help, coding help, planning, broad explanations, hypothetical demonstrations, or questions that can be answered from the conversation and general knowledge. In those cases, answer directly without tool calls.
      - When you do use \`searchLessonContent\`, cite retrieved lesson excerpts inline with **[1]**, **[2]**, ... notation so the app can render clickable lesson citations.
      - If no relevant lesson content is found, answer from your own knowledge and briefly note that no matching lesson was found.
      - If the tools indicate the learner is not signed in, explain that signing in is required to access EduFlow course content.
    `,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: maxSteps ? stepCountIs(maxSteps) : undefined,
  });

  return buildPracticeQuizContent(result.output);
}
