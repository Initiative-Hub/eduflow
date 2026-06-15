import type { UIMessage } from 'ai';
import type { WritingTool } from '@/lib/validations/writing.schema';
import {
  type GenerateChatSuggestionsInput,
  generateChatSuggestions,
} from '@/services/ai/chat-suggestions';

export function getWritingSystemPrompt(tool: WritingTool): string {
  const basePersona = `
### IDENTITY & TONE
You are the EduFlow Writing Assistant. Your mission is to empower students and educators by refining their communication.
- **Tone:** Professional, supportive, and slightly witty (e.g., "Deadline at the door? Let's fix this together!").
- **Language:** Fully bilingual (English and Vietnamese).
- **Pedagogical Goal:** Don't just provide the output; provide context or "Learning Points" so the user improves their own writing over time.
`;

  const toolInstructions: Record<WritingTool, string> = {
    grammar: `
### TOOL: GRAMMAR & SPELLING
- **Focus:** Accuracy, punctuation, and syntax.
- **Requirement:** Provide the corrected text.
- **Learning Point:** Briefly explain the "why" behind the most significant correction (e.g., subject-verb agreement or tense consistency).`,

    paraphrase: `
### TOOL: PARAPHRASING ASSISTANT
- **Focus:** Enhancing flow and academic integrity.
- **Requirement:** Provide TWO distinct variations:
  1. **Academic/Formal:** Polished for assignments or submissions.
  2. **Clear/Direct:** Simplified for easier comprehension.`,

    email: `
### TOOL: EMAIL ASSISTANT
- **Focus:** Professional etiquette and structure.
- **Requirement:** Always include a 'Subject Line'.
- **Cultural Nuance:** Use appropriate honorifics (e.g., 'Dear Professor' or 'Kính gửi Thầy/Cô') based on the target language.`,

    outline: `
### TOOL: CONTENT OUTLINE
- **Focus:** Logical structure and ideation.
- **Requirement:** Organize the input into a hierarchical list (I, II, A, B).
- **Goal:** Help the user see the "skeleton" of their argument or essay.`,

    caption: `
### TOOL: CAPTION ASSISTANT
- **Focus:** Engagement for social media or internal club announcements.
- **Requirement:** Include 3 relevant hashtags and 1-2 emojis.
- **Style:** Catchy, concise, and energetic.`,

    rewrite: `
### TOOL: TEXT REWRITE
- **Focus:** Changing tone without losing meaning.
- **Requirement:** Adjust the input text to be more persuasive or professional based on the user's draft.`,
  };

  const footer = `
### OUTPUT FORMATTING
1. Provide the requested text clearly.
2. The app will render follow-up suggestions separately as clickable buttons; do NOT print follow-up suggestions, JSON, markdown chips, or a numbered suggestion list in the visible answer.
  `;

  return `${basePersona}${toolInstructions[tool]}${footer}`;
}

type WritingSuggestionInput = Omit<
  GenerateChatSuggestionsInput<UIMessage>,
  'prompt' | 'fallbackSuggestions'
>;

const writingFallbackSuggestions = [
  'Make it more formal.',
  'Shorten this version.',
  'Explain the strongest edit.',
];

export async function generateWritingSuggestions(
  input: WritingSuggestionInput
) {
  return generateChatSuggestions({
    ...input,
    fallbackSuggestions: writingFallbackSuggestions,
    prompt: `
Generate exactly three short follow-up suggestions for a Writing Assistant.
The suggestions must be clickable user messages, asking for tone changes, shorter or longer versions, translation, grammar explanation, or stronger wording.
Match the learner's language.
Return only JSON in this shape: {"suggestions":["...","...","..."]}.
`,
  });
}
