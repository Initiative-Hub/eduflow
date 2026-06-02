import type { UIMessage } from 'ai';
import * as z from 'zod';
import {
  DEFAULT_SOCRATIC_DISCIPLINE,
  type SocraticDiscipline,
  socraticDisciplineSchema,
} from '@/lib/validations/socratic.schema';
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
  discipline: SocraticDiscipline;
  messages: SocraticUIMessage[];
  assistantText: string;
  providerName?: ChatProvider;
  model?: string;
  apiKey?: string;
  providerOptions?: StreamChatInput['providerOptions'];
}

const disciplineGuidance: Record<SocraticDiscipline, string> = {
  quantumPhysics: `
Discipline: quantum physics.
Guide with states, observables, probability amplitudes, measurement effects, and conceptual models before equations.
Ask the learner what the system is, what can be observed, and which principle or approximation governs the situation.`,
  philosophicalEthics: `
Discipline: philosophical ethics.
Guide with moral frameworks, objections, principles, and edge cases before conclusions.
Ask the learner which value conflict matters most, what each framework would prioritize, and what objection could challenge their claim.`,
  biochemistry: `
Discipline: biochemistry.
Guide with molecular interactions, energetic constraints, structure-function relationships, and pathway logic.
Ask the learner which molecule is changing, what drives the change, and how the local mechanism affects the larger biological system.`,
  macroeconomics: `
Discipline: macroeconomics.
Guide with policy tradeoffs, incentives, and system-level effects using core indicators such as inflation, output, unemployment, and rates.
Ask the learner which variable moves first, who responds to that change, and what second-order effect follows.`,
};

const fallbackSuggestions: Record<SocraticDiscipline, string[]> = {
  quantumPhysics: [
    'Which principle should I start from?',
    'What does the measurement change here?',
    'Can you give me one smaller hint?',
  ],
  philosophicalEthics: [
    'Which moral framework fits this best?',
    'What objection should I test first?',
    'Can you ask me a narrower question?',
  ],
  biochemistry: [
    'Which molecule should I track first?',
    'What step in the pathway matters most?',
    'Can you give me one mechanistic hint?',
  ],
  macroeconomics: [
    'Which indicator should I reason about first?',
    'Who responds first in this economy?',
    'Can you give me a smaller policy hint?',
  ],
};

export function getSocraticSystemPrompt(
  discipline: SocraticDiscipline
): string {
  const resolvedDiscipline = socraticDisciplineSchema
    .catch(DEFAULT_SOCRATIC_DISCIPLINE)
    .parse(discipline);

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

    ### DISCIPLINE ADAPTATION
    ${disciplineGuidance[resolvedDiscipline]}

    ### RESPONSE SHAPE
    1. Acknowledge the learner's current idea or confusion.
    2. Give a short hint or framing question.
    3. Ask one focused question that moves the learner forward.
    4. The app will render three follow-up suggestions separately; do not print suggestions as JSON, markdown chips, or a numbered list in the visible answer.

    ### LANGUAGE
    Reply in the learner's language by default. If they mix English and Vietnamese, prioritize clarity and preserve their intent.
  `;
}

export function getSocraticDisciplineFromMetadata(
  metadata: unknown
): SocraticDiscipline {
  if (!metadata || typeof metadata !== 'object')
    return DEFAULT_SOCRATIC_DISCIPLINE;

  const value = (metadata as { discipline?: unknown }).discipline;
  const parsed = socraticDisciplineSchema.safeParse(value);

  return parsed.success ? parsed.data : DEFAULT_SOCRATIC_DISCIPLINE;
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

function fillSuggestions(
  suggestions: string[],
  discipline: SocraticDiscipline
): string[] {
  return normalizeSocraticSuggestionItems([
    ...suggestions,
    ...fallbackSuggestions[discipline],
  ]);
}

export async function generateSocraticSuggestions({
  provider,
  discipline,
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
                Discipline: ${discipline}

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
      return fallbackSuggestions[discipline];
    }

    return fillSuggestions(parsed.data.suggestions, discipline);
  } catch {
    return fallbackSuggestions[discipline];
  }
}
