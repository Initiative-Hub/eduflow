import type { UIMessage } from 'ai';
import { z } from 'zod';
import { getMessageText } from '@/utils/chat-message';
import { normalizeChatSuggestionItems } from '@/utils/chat-suggestions';
import type { ChatProviderService } from './ChatProviderService';
import type { ChatProvider } from './chat-provider.types';

const suggestionResponseSchema = z.object({
  suggestions: z.array(z.string()).min(1).max(3),
});

export interface ChatSuggestionPreset {
  prompt: string;
  fallbackSuggestions: readonly string[];
}

export interface GenerateChatSuggestionsInput<TMessage extends UIMessage> {
  provider: ChatProviderService;
  messages: TMessage[];
  assistantText: string;
  providerName?: ChatProvider;
  model?: string;
  apiKey?: string;
  prompt: string;
  fallbackSuggestions: readonly string[];
}

function extractJsonObject(text: string): unknown {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace)
    return null;

  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function fillSuggestions(
  suggestions: readonly string[],
  fallbackSuggestions: readonly string[]
): string[] {
  return normalizeChatSuggestionItems([...suggestions, ...fallbackSuggestions]);
}

export async function generateChatSuggestions<TMessage extends UIMessage>({
  provider,
  messages,
  assistantText,
  providerName,
  model,
  apiKey,
  prompt,
  fallbackSuggestions,
}: GenerateChatSuggestionsInput<TMessage>): Promise<string[]> {
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
        messages: [
          {
            id: `suggestions-${crypto.randomUUID()}`,
            role: 'user',
            parts: [
              {
                type: 'text',
                text: `Latest learner message: ${latestUserText} Latest assistant response:${assistantText}`,
              },
            ],
          },
        ],
      },
      { prompt }
    );

    const parsed = suggestionResponseSchema.safeParse(
      extractJsonObject(await result.text)
    );

    return fillSuggestions(
      parsed.success ? parsed.data.suggestions : [],
      fallbackSuggestions
    );
  } catch {
    return fillSuggestions([], fallbackSuggestions);
  }
}
