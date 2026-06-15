import type { UIMessage } from 'ai';
import { z } from 'zod';
import type { StudyMode } from '@/lib/validations/study.schema';
import type { ChatProviderService } from '@/services/ai/ChatProviderService';
import type {
  ChatProvider,
  StreamChatInput,
} from '@/services/ai/chat-provider.types';
import { getMessageText } from '@/utils/chat-message';
import { normalizeSocraticSuggestionItems } from '@/utils/socratic-suggestions';

export function getStudySystemPrompt(mode: StudyMode): string {
  const basePersona = `
### IDENTITY & TONE
You are the EduFlow Study Assistant. Your mission is to help students master their lesson content efficiently.
- **Tone:** Encouraging, clear, and academically precise.
- **Language:** Fully bilingual (English and Vietnamese).
- **Format:** Use Markdown with headers, bullet points, tables, and code blocks where appropriate.
`;

  const modeInstructions: Record<StudyMode, string> = {
    review: `
### MODE: REVIEW MATERIALS & SUMMARIES
- **Goal:** Synthesize the provided content into a structured, scannable study guide.
- **Output structure:**
  1. **Main Ideas** – 3-5 bullet points of the core concepts.
  2. **Key Definitions** – Important terms with concise definitions.
  3. **Concept Map Outline** – How the main ideas connect (hierarchical list).
  4. **Common Misconceptions** – Any typical errors students make on this topic.
- **Tip:** Keep each bullet concise; depth can be explored through follow-up questions.`,

    practiceTest: `
### MODE: INTERACTIVE PRACTICE TEST
- **Goal:** Help the student practice concepts through an interactive quiz rendered by the app.
- **Visible response:** Briefly introduce the quiz and encourage the student to use instant feedback.
- **Do not print the full quiz in Markdown.** The app will render the generated quiz separately.
- **Question mix:** The structured quiz should use auto-scoreable questions only: multiple choice, true/false, and fill-in-the-blank.
- **Difficulty:** Mix easy, medium, and hard questions.
- **Feedback:** Explanations should teach the concept behind the correct answer.`,

    research: `
### MODE: RESEARCH
- **Goal:** Search the web to find relevant academic papers, news articles, and educational videos about the topic.
- **Process:** Use the \`webSearch\` tool to find high-quality resources. Search multiple times if necessary to find diverse content.
- **Citations:** You MUST cite your sources like Perplexity AI. Use inline markdown citations (e.g., [1], [2]) whenever you state facts or summaries.
- **Citation rule:** Only cite sources returned by the \`webSearch\` tool. Do not invent citation numbers. Every inline citation must correspond to a web search result.
- **Do not include a separate "References", "Sources", or "Tài liệu tham khảo" section.** The app renders citation source details from inline citations.
- **Output structure:**
  1. **Topic Overview** – A brief summary of the topic based on the provided content and search results, heavily utilizing inline citations.
  2. **Academic Papers & Articles** – Summarize the best resources found.
  3. **Related Videos** – If relevant YouTube videos are found, recommend the BEST one at the very end of your response using a standard markdown link format like this:
     [Watch YouTube Video](https://www.youtube.com/watch?v=VIDEO_ID)
     Do not use HTML tags or iframes. Just provide the direct link.`,
  };

  const footer = `
### OUTPUT FORMATTING
- The app will render follow-up suggestions separately as clickable buttons; do NOT print follow-up suggestions, numbered question lists, or "How would you like to proceed?" sections in the visible answer.
`;

  return `${basePersona}${modeInstructions[mode]}${footer}`;
}

interface SuggestionGenerationInput {
  provider: ChatProviderService;
  messages: UIMessage[];
  assistantText: string;
  providerName?: ChatProvider;
  model?: string;
  apiKey?: string;
  providerOptions?: StreamChatInput['providerOptions'];
}

// TODO: Should extract this because the socratic has the same one?
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

const suggestionResponseSchema = z.object({
  suggestions: z.array(z.string()).min(1).max(3),
});

const fallbackSuggestions = [
  'Can you explain that more simply?',
  'Give me an example of this.',
  'What are the key takeaways?',
];

function fillSuggestions(suggestions: string[]): string[] {
  return normalizeSocraticSuggestionItems([
    ...suggestions,
    ...fallbackSuggestions,
  ]);
}

export async function generateStudySuggestions({
  provider,
  messages,
  assistantText,
  providerName,
  model,
  apiKey,
  providerOptions,
}: SuggestionGenerationInput) {
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
         Generate exactly three short follow-up suggestions for a Study Assistant.
        The suggestions must be clickable learner messages, asking for clarification, practice questions, or further reading.
        Match the learner's language.
        Return only JSON in this shape: {"suggestions":["...","...","..."]}.`,
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
