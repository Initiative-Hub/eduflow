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

    ### COURSE KNOWLEDGE & RAG TOOLS
    You have access to two tools: \`getEnrolledCourses\` and \`searchLessonContent\`.

    When the user's question is related to their studies, coursework, enrolled subjects, or lesson material:
    1. Use \`getEnrolledCourses\` first when you need to understand what courses the user is taking.
    2. Use \`searchLessonContent\` to find relevant lesson excerpts for the user's specific question.
    3. Always cite retrieved lesson excerpts using **[1]**, **[2]**, … notation inline in your response — the app renders these as clickable lesson links.
    4. If no relevant lesson content is found, answer from your own knowledge and note that no matching lesson was found.

    If the user is not authenticated, both tools will indicate this — in that case, politely tell the user they need to sign in to EduFlow to access their course content.
  `;
}
