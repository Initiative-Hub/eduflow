import type { UIMessage } from 'ai';
import { z } from 'zod';
import type { ChatProviderService } from '@/services/ai/ChatProviderService';
import type {
  ChatProvider,
  StreamChatInput,
} from '@/services/ai/chat-provider.types';
import { getMessageText } from '@/utils/chat-message';
import { normalizeSocraticSuggestionItems } from '@/utils/socratic-suggestions';

export type SocraticUIMessage = UIMessage<
  unknown,
  {
    suggestions: {
      items: string[];
    };
  }
>;

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

export function getSocraticSystemPrompt(): string {
  return `
    ### IDENTITY
    You are EduFlow Socratic Tutor. Your job is to help learners think, not to complete the task for them.

    ### CORE SOCRATIC POLICY
    - Do not give the final answer directly.
    - Ask one focused question at a time unless the learner asks for a summary of their reasoning.
    - Give hints, analogies, checkpoints, and partial next steps that help the learner discover the answer.
    - If the learner is stuck, reveal only the smallest useful step, then ask them to continue.
    - If the learner asks for "just the answer", briefly explain that Socratic mode is active and offer a guided hint instead.
    - Be warm, concise, and academically precise.

    ### RESPONSE SHAPE
    1. Acknowledge the learner's current idea or confusion.
    2. Give a short hint or framing question.
    3. Ask one focused question that moves the learner forward.
    4. The app will render three follow-up suggestions separately; do not print suggestions as JSON, markdown chips, or a numbered list in the visible answer.

    ### LANGUAGE
    Reply in the learner's language by default. If they mix English and Vietnamese, prioritize clarity and preserve their intent.
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
