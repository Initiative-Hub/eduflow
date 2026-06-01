import type { UIMessage } from 'ai';
import * as z from 'zod';
import {
  DEFAULT_SOCRATIC_SUBJECT,
  type SocraticSubject,
  socraticSubjectSchema,
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
  subject: SocraticSubject;
  messages: SocraticUIMessage[];
  assistantText: string;
  providerName?: ChatProvider;
  model?: string;
  apiKey?: string;
  providerOptions?: StreamChatInput['providerOptions'];
}

const subjectGuidance: Record<SocraticSubject, string> = {
  math: `
Subject: math.
Guide with definitions, variable setup, pattern recognition, and one algebraic or logical step at a time.
When formulas are needed, use renderable KaTeX and ask the learner to predict the next transformation.`,
  physics: `
Subject: physics.
Guide with units, diagrams, proportional reasoning, measurements, and the physical meaning behind each variable.
Ask the learner to connect the equation to the situation before computing.`,
  chemistry: `
Subject: chemistry.
Guide with particle-level reasoning, conservation, bonding patterns, reaction evidence, and units.
Ask the learner what is changing, what is conserved, and which rule or model applies.`,
  biology: `
Subject: biology.
Guide with structure-function links, systems thinking, cause-effect chains, and evidence from observations.
Ask the learner to trace how one change affects the next level of organization.`,
  history: `
Subject: history.
Guide with chronology, causation, sourcing, context, and competing perspectives.
Ask the learner to identify evidence before forming a conclusion.`,
  geography: `
Subject: geography.
Guide with maps, spatial patterns, scale, human-environment interaction, and regional comparison.
Ask the learner what pattern they notice and what could explain it.`,
  english: `
Subject: english.
Guide with context clues, grammar patterns, rhetorical choices, revision goals, and examples.
Ask the learner to explain the effect of a word, sentence, or structure before revising.`,
  other: `
Subject: other.
Guide by first clarifying the topic, the learner's goal, known facts, and where the confusion begins.
Ask the learner to define the problem in their own words before suggesting a next step.`,
};

const fallbackSuggestions: Record<SocraticSubject, string[]> = {
  math: [
    'What should I define first?',
    'Can you give me a smaller hint?',
    'How do I check the next step?',
  ],
  physics: [
    'Which quantity should I track?',
    'Can we reason from the units?',
    'What diagram would help here?',
  ],
  chemistry: [
    'What is conserved in this reaction?',
    'Which particles are changing?',
    'Can you give me one hint?',
  ],
  biology: [
    'Which structure matters most?',
    'What cause-effect chain should I trace?',
    'How would I test that idea?',
  ],
  history: [
    'Which evidence should I inspect first?',
    'What happened before this event?',
    'Whose perspective is missing?',
  ],
  geography: [
    'What spatial pattern should I notice?',
    'Which scale should I compare?',
    'What factor might explain the region?',
  ],
  english: [
    'What clue in the sentence matters?',
    'How should I revise this phrase?',
    'Can you ask me a simpler question?',
  ],
  other: [
    'What should I clarify first?',
    'Can you give me a smaller hint?',
    'How do I test my thinking?',
  ],
};

export function getSocraticSystemPrompt(subject: SocraticSubject): string {
  const resolvedSubject = socraticSubjectSchema
    .catch(DEFAULT_SOCRATIC_SUBJECT)
    .parse(subject);

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

    ### SUBJECT ADAPTATION
    ${subjectGuidance[resolvedSubject]}

    ### RESPONSE SHAPE
    1. Acknowledge the learner's current idea or confusion.
    2. Give a short hint or framing question.
    3. Ask one focused question that moves the learner forward.
    4. The app will render three follow-up suggestions separately; do not print suggestions as JSON, markdown chips, or a numbered list in the visible answer.

    ### LANGUAGE
    Reply in the learner's language by default. If they mix English and Vietnamese, prioritize clarity and preserve their intent.
  `;
}

export function getSocraticSubjectFromMetadata(
  metadata: unknown
): SocraticSubject {
  if (!metadata || typeof metadata !== 'object')
    return DEFAULT_SOCRATIC_SUBJECT;

  const value = (metadata as { subject?: unknown }).subject;
  const parsed = socraticSubjectSchema.safeParse(value);

  return parsed.success ? parsed.data : DEFAULT_SOCRATIC_SUBJECT;
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
  subject: SocraticSubject
): string[] {
  return normalizeSocraticSuggestionItems([
    ...suggestions,
    ...fallbackSuggestions[subject],
  ]);
}

export async function generateSocraticSuggestions({
  provider,
  subject,
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
                Subject: ${subject}

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
      return fallbackSuggestions[subject];
    }

    return fillSuggestions(parsed.data.suggestions, subject);
  } catch {
    return fallbackSuggestions[subject];
  }
}
