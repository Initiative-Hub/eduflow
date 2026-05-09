import type { UIMessage } from 'ai';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';
import type {
  ChatProvider,
  StreamChatInput,
} from '@/services/ai/chat-provider.types';
export const maxDuration = 30;

export type WritingTool =
  | 'caption'
  | 'paraphrase'
  | 'email'
  | 'outline'
  | 'grammar'
  | 'rewrite';

// TODO: SHOULD WE MOVE THIS TO CONSTANT FILE
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
2. End with 3 "Follow-up Suggestions" as clickable questions (e.g., "Make it more formal?", "Translate to Vietnamese?", "Explain the grammar fix?").
  `;

  return `${basePersona}${toolInstructions[tool]}${footer}`;
}

const writingRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).min(1),
  tool: z.enum([
    'caption',
    'paraphrase',
    'email',
    'outline',
    'grammar',
    'rewrite',
  ]),
  provider: z.custom<ChatProvider>().optional(),
  model: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  providerOptions: z.custom<StreamChatInput['providerOptions']>().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const [{ chatId }, body] = await Promise.all([params, req.json()]);

  const parsedBody = writingRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return new Response(
      JSON.stringify({
        error: 'Invalid request payload',
        details: parsedBody.error.flatten(),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const toolMode = parsedBody.data.tool;

  const systemPrompt = `You are a writing assistant. The user will provide text and select a tool. Tool selected: ${toolMode} Response Accordingly.`;

  const provider = ChatProviderFactory.create(
    parsedBody.data.provider ?? DEFAULT_PROVIDER
  );

  const result = await provider.streamChat({
    ...(parsedBody.data as StreamChatInput),
    system: systemPrompt,
  });

  return result;
}
