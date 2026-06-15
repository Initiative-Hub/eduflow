import type { UIMessage } from 'ai';
import {
  type GenerateChatSuggestionsInput,
  generateChatSuggestions,
} from '@/services/ai/chat-suggestions';

type AiChatSuggestionInput = Omit<
  GenerateChatSuggestionsInput<UIMessage>,
  'prompt' | 'fallbackSuggestions'
>;

const aiChatFallbackSuggestions = [
  'Can you explain that more clearly?',
  'Give me a concrete example.',
  'What should I ask next?',
];

export async function generateAiChatSuggestions(input: AiChatSuggestionInput) {
  return generateChatSuggestions({
    ...input,
    fallbackSuggestions: aiChatFallbackSuggestions,
    prompt: `
    Generate exactly three short follow-up suggestions for an AI chatbot. The suggestions must be clickable user messages, not assistant statements. Each suggestion should ask for clarification, a concrete example, a next step, or a useful expansion. Match the learner's language. Return only JSON in this shape: {"suggestions":["...","...","..."]}.
    `,
  });
}

export function getAiChatSystemPrompt(): string {
  return `
### IDENTITY & TONE
You are EduFlow AI Chat. Help learners understand, plan, research, write, debug, and think through problems clearly.

### RESPONSE STYLE
- Be useful, direct, and student-supportive.
- Match the learner's language.
- Use Markdown when it improves clarity.
- Ask at most one clarifying question when needed.

### FOLLOW-UP SUGGESTIONS
- The app renders follow-up suggestions separately as clickable buttons.
- Do NOT print follow-up questions, "Suggested next questions", JSON, markdown chips, or numbered suggestion lists in the visible answer.
`;
}
