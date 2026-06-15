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
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';
import type { StreamChatInput } from '@/services/ai/chat-provider.types';

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
}: {
  messages: UIMessage[];
  model?: string;
  apiKey?: string;
  providerOptions?: StreamChatInput['providerOptions'];
}): Promise<QuizContent> {
  const resolvedApiKey = apiKey ?? process.env.OPENROUTER_API_KEY;

  if (!resolvedApiKey)
    throw new Error('Missing API key for provider "openrouter"');

  const provider = createOpenRouter({ apiKey: resolvedApiKey });

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
- Generate exactly 10 questions.
- Use exactly 5 multiple choice, 3 true/false, and 2 fill-in-the-blank questions.
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
