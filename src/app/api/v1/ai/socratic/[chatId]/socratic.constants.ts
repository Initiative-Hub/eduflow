import { z } from 'zod';
import {
  DEFAULT_SOCRATIC_GUIDANCE_DEPTH,
  SOCRATIC_GUIDANCE_DEPTHS,
  type SocraticGuidanceDepth,
  socraticGuidanceDepthSchema,
} from '@/lib/validations/socratic.schema';
import type { ChatProviderService } from '@/services/ai/ChatProviderService';
import type {
  ChatProvider,
  StreamChatInput,
} from '@/services/ai/chat-provider.types';
import type { SocraticUIMessage } from '@/types/socratic-ui-message';
import { getMessageText } from '@/utils/chat-message';
import { normalizeSocraticSuggestionItems } from '@/utils/socratic-suggestions';

interface SuggestionGenerationInput {
  provider: ChatProviderService;
  messages: SocraticUIMessage[];
  assistantText: string;
  providerName?: ChatProvider;
  model?: string;
  apiKey?: string;
  providerOptions?: StreamChatInput['providerOptions'];
}

const fallbackSuggestions = [
  'Which idea should I examine first?',
  'Can you give me one smaller hint?',
  'What question should I answer next?',
];

export const BASE_SOCRATIC_SYSTEM_PROMPT = `
    ### IDENTITY
    You are EduFlow Socratic Tutor. Your job is to help learners think, not to complete the task for them.

    ### CORE SOCRATIC POLICY
    - Do not give the final answer directly.
    - Ask focused questions that help the learner reason, but do not hide useful context when a short explanation or worked scaffold would help them continue.
    - Give hints, analogies, checkpoints, and partial next steps that help the learner discover the answer.
    - If the learner is stuck, provide the smallest useful explanation or step sequence that helps them move forward without replacing their thinking.
    - If the learner asks for "just the answer", briefly explain that Socratic mode is active and offer a guided hint instead.
    - Be warm, academically precise, and student-supportive.

    ### RESPONSE SHAPE
    1. Acknowledge the learner's current idea or confusion.
    2. Give helpful explanation, structure, or a step sequence before the closing question when it will improve understanding.
    3. End with one focused question that moves the learner forward.
    4. The app will render three follow-up suggestions separately; do not print suggestions as JSON, markdown chips, or a numbered list in the visible answer.

    ### LANGUAGE
    Reply in the learner's language by default. If they mix English and Vietnamese, prioritize clarity and preserve their intent.
`;

export const SOCRATIC_GUIDANCE_DEPTH_PROMPTS: Record<
  SocraticGuidanceDepth,
  string
> = {
  hint: `
    ### GUIDANCE DEPTH: HINT
    - Keep the reply mostly Socratic and concise.
    - Give brief framing and one small hint before your closing question.
    - Avoid full worked steps unless the learner is clearly blocked.
  `,
  balanced: `
    ### GUIDANCE DEPTH: BALANCED
    - Give a short explanation of the core idea in plain student-friendly language.
    - Include 2 to 3 concrete reasoning steps or checkpoints before the closing question.
    - Name one common mistake or decision point when it would help the learner.
  `,
  guidedSteps: `
    ### GUIDANCE DEPTH: GUIDED STEPS
    - Give more instructional support while staying in Socratic mode.
    - Explain the concept clearly, then provide a structured step-by-step path the learner can follow.
    - Include enough detail that a student can continue the problem on their own after reading the reply.
    - Add one misconception check or verification step before the closing question.
  `,
};

export function getSocraticSystemPrompt(
  guidanceDepth: SocraticGuidanceDepth = DEFAULT_SOCRATIC_GUIDANCE_DEPTH
): string {
  const resolvedGuidanceDepth = socraticGuidanceDepthSchema
    .catch(DEFAULT_SOCRATIC_GUIDANCE_DEPTH)
    .parse(guidanceDepth);

  return `
    ${BASE_SOCRATIC_SYSTEM_PROMPT.trim()}
    ${SOCRATIC_GUIDANCE_DEPTH_PROMPTS[resolvedGuidanceDepth].trim()}
  `;
}

function extractJsonObject(text: string): unknown {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

const suggestionResponseSchema = z.object({
  suggestions: z.array(z.string()).min(1).max(3),
});

function fillSuggestions(suggestions: string[]): string[] {
  return normalizeSocraticSuggestionItems([
    ...suggestions,
    ...fallbackSuggestions,
  ]);
}

export async function generateSocraticSuggestions({
  provider,
  messages,
  assistantText,
  providerName,
  model,
  apiKey,
  providerOptions,
}: SuggestionGenerationInput): Promise<string[]> {
  const latestUserMessage = messages
    .toReversed()
    .find((message) => message.role === 'user');
  const latestUserText = latestUserMessage
    ? getMessageText(latestUserMessage)
    : '';

  try {
    const result = await provider.streamChat(
      {
        provider: providerName,
        model,
        apiKey,
        providerOptions,
        messages: [
          {
            id: `suggestions-${crypto.randomUUID()}`,
            role: 'user',
            parts: [
              {
                type: 'text',
                text: `
                Latest learner message:
                ${latestUserText}

                Latest tutor response:
                ${assistantText}`,
              },
            ],
          },
        ],
      },
      {
        prompt: `
        Generate exactly three short follow-up suggestions for Socratic tutoring.
        The suggestions must be clickable learner messages, not tutor statements.
        Each suggestion should ask for a hint, a next reasoning step, or a clarification.
        Match the learner's language.
        Return only JSON in this shape: {"suggestions":["...","...","..."]}.
        `,
        mode: 'replace',
      }
    );

    const parsed = suggestionResponseSchema.safeParse(
      extractJsonObject(await result.text)
    );

    if (!parsed.success) {
      return fallbackSuggestions;
    }

    return fillSuggestions(parsed.data.suggestions);
  } catch {
    return fallbackSuggestions;
  }
}

export { DEFAULT_SOCRATIC_GUIDANCE_DEPTH, SOCRATIC_GUIDANCE_DEPTHS };
