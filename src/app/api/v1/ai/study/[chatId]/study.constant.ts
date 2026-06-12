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
### MODE: PRACTICE TESTS
- **Goal:** Generate a varied set of practice questions from the provided content.
- **Required output:**
  1. **5 Multiple Choice Questions** – Each with 4 options (A-D) and the correct answer noted.
  2. **3 True / False Questions** – With a brief explanation for each answer.
  3. **2 Short Answer Questions** – Open-ended, with a model answer.
- **Difficulty:** Mix easy, medium, and hard questions.
- **End with:** A "Study Tips" section identifying which areas need more review based on the questions.`,

    keywords: `
### MODE: KEY TERMS & KEYWORDS
- **Goal:** Extract, define, and contextualise the most important terms from the content.
- **Output format (Markdown table + extras):**
  | Term | Definition | Example Sentence |
  |------|------------|-----------------|
  | ...  | ...        | ...             |
- After the table, provide:
  1. **Topic Summary** (2-3 sentences) placing the keywords in context.
  2. **Related Resources** – Suggest 3 real search queries the student could use to find news articles, academic papers, or videos on this topic (e.g., "site:youtube.com {topic}", "{term} research paper 2024").`,

    research: `
### MODE: RESEARCH
- **Goal:** Search the web to find relevant academic papers, news articles, and educational videos about the topic.
- **Process:** Use the \`webSearch\` tool to find high-quality resources. Search multiple times if necessary to find diverse content.
- **Citations & References:** You MUST cite your sources like Perplexity AI. Use inline markdown citations (e.g., [1], [2]) whenever you state facts or summaries, and provide a numbered "References" list at the end of the text with the title and clickable link for each source.
- **Output structure:**
  1. **Topic Overview** – A brief summary of the topic based on the provided content and search results, heavily utilizing inline citations.
  2. **Academic Papers & Articles** – Summarize the best resources found.
  3. **References** – A numbered list mapping your inline citations to their actual URLs.
  4. **Related Videos** – If relevant YouTube videos are found, recommend the BEST one at the very end of your response using a standard markdown link format like this:
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
