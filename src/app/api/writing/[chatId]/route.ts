import type { UIMessage } from 'ai';
import { z } from 'zod';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';
import type {
  ChatProvider,
  StreamChatInput,
} from '@/services/ai/chat-provider.types';
import { getWritingSystemPrompt } from './writing.constants';
export const maxDuration = 30;

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

  const writingTool = parsedBody.data.tool;

  const systemPrompt = getWritingSystemPrompt(writingTool);

  const provider = ChatProviderFactory.create(
    parsedBody.data.provider ?? DEFAULT_PROVIDER
  );

  const result = await provider.streamChat({
    ...(parsedBody.data as StreamChatInput),
    system: systemPrompt,
  });

  return result;
}
