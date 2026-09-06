import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createTextStreamResponse, streamText, toTextStream } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';

const lessonParamsSchema = z.object({
  lessonId: z.string().uuid(),
});

const requestSchema = z
  .object({
    html: z.string().min(1).max(40_000),
    instruction: z.string().trim().min(1).max(2_000),
  })
  .strict()
  .refine(
    ({ html }) => /<selection(?:\s[^>]*)?>[\s\S]*?<\/selection>/i.test(html),
    { message: 'HTML must contain a selection marker.' }
  );

const MAX_OUTPUT_TOKENS = 8_000;

const LESSON_EDITOR_SYSTEM_PROMPT = `
  You edit a focused fragment from an EduFlow lesson.

  Return only valid HTML for the supplied fragment. Never use Markdown fences, explanations, a document wrapper, script, style, or external content.
  The supplied HTML contains one or more <selection>...</selection> tags. Their contents are the focus of the requested edit.
  Prioritize improving those focus zones. You may edit related text elsewhere in the supplied fragment only when necessary for grammatical or semantic coherence.
  Never modify content outside the supplied fragment.
  Use only inline HTML when formatting the selected text. Keep all block node types, block attributes, and list/quote structure unchanged.
  Do not add images, videos, links, or other media. Keep existing media unchanged.
  The response replaces the complete supplied fragment at its original document depth. Keep every required outer wrapper from the supplied fragment (for example, return <li>...</li> when the fragment is a list item) so it remains valid at that exact replacement position.
  Do not include <selection> tags in the response.
`;

export const POST = withAuth(async (request, sessionData, { params }) => {
  const parsedParams = lessonParamsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { message: 'Invalid lesson ID.' },
      { status: 400 }
    );
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: parsedParams.data.lessonId,
      deletedAt: null,
      module: {
        deletedAt: null,
        course: { deletedAt: null },
      },
    },
    select: {
      module: {
        select: { courseId: true },
      },
    },
  });

  if (!lesson) {
    return NextResponse.json({ message: 'Lesson not found.' }, { status: 404 });
  }

  const permissions = await getCoursePermissions(
    sessionData.user.id,
    lesson.module.courseId
  );
  if (permissions.withoutPermission(COURSE_PERMISSION.AI_USE_LESSON_EDITOR)) {
    return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  }

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
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    model: provider(DEFAULT_MODELS.openrouter),
    prompt: JSON.stringify(parsed.data),
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
});
