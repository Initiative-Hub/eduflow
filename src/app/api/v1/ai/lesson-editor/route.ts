import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createTextStreamResponse, streamText, toTextStream } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';

const requestSchema = z.object({
  beforeText: z.string().max(12_000),
  html: z.string().min(1).max(40_000),
  instruction: z.string().trim().min(1).max(2_000),
  selectionText: z.string().min(1).max(12_000),
});

const LESSON_EDITOR_SYSTEM_PROMPT = `
You edit a selected fragment from an EduFlow lesson.

Return only valid HTML for the supplied fragment. Never use Markdown fences, explanations, a document wrapper, script, style, or external content.
Preserve all content that is outside the user's exact selection unless a necessary block-level formatting change requires the enclosing block to change.
You may edit text, inline formatting, headings, lists, block quotes, code blocks, and paragraph alignment using only the tags already present in the fragment's editor schema.
Do not add images, videos, links, or other media. Keep existing media unchanged.
The response replaces the complete supplied fragment, so it must be valid standalone fragment HTML.
`;

export const POST = withAuth(async (request) => {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid AI edit request.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: 'AI editing is not configured.' },
      { status: 503 }
    );
  }

  const provider = createOpenRouter({ apiKey });
  const result = streamText({
    instructions: LESSON_EDITOR_SYSTEM_PROMPT,
    model: provider(DEFAULT_MODELS.openrouter),
    prompt: JSON.stringify({
      instruction: parsed.data.instruction,
      selectedText: parsed.data.selectionText,
      surroundingFragment: parsed.data.html,
      fragmentText: parsed.data.beforeText,
    }),
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
});
